package com.rich.sodam.service;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * win-back(GR-NEW-05) 대상 판정 — 휴면 전환 D+7/D+30 임계만 발송, 그 외/장기 휴면 제외.
 * NotificationService 는 MockBean — 실제 푸시·inbox 적재 없이 호출만 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WinBackServiceTest {

    @Autowired private WinBackService winBackService;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private UserRepository userRepository;

    @MockBean private NotificationService notificationService;

    /** 휴면 사장 1명 생성 후 즉시 markDormant (dormantAt = now). */
    private Subscription dormantOwner(String email) {
        User u = userRepository.save(new User(email, "u"));
        u.setUserGrade(UserGrade.MASTER);
        Subscription s = Subscription.pending(u, PlanType.FREE, BillingCycle.MONTHLY, "cust_" + email);
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.markDormant();
        return subscriptionRepository.save(s);
    }

    @Test
    @DisplayName("휴면 전환 D+7 사장에게 win-back 발송")
    void sendsAtDay7() {
        Subscription sub = dormantOwner("wb_d7@x.com");
        Long ownerId = sub.getUser().getId();

        // dormantAt = now 이므로 asOf 를 +7일 주면 임계 D+7 에 걸린다.
        int sent = winBackService.sendWinBackForDay(LocalDateTime.now().plusDays(7));

        assertThat(sent).isEqualTo(1);
        verify(notificationService, times(1)).notifyWinBack(ownerId);
    }

    @Test
    @DisplayName("휴면 전환 D+30 사장에게 win-back 발송")
    void sendsAtDay30() {
        Subscription sub = dormantOwner("wb_d30@x.com");
        Long ownerId = sub.getUser().getId();

        int sent = winBackService.sendWinBackForDay(LocalDateTime.now().plusDays(30));

        assertThat(sent).isEqualTo(1);
        verify(notificationService, times(1)).notifyWinBack(ownerId);
    }

    @Test
    @DisplayName("임계(D+7/D+30)가 아닌 날엔 발송 안 함")
    void noSendOffThreshold() {
        dormantOwner("wb_off@x.com");

        // D+15 — 어떤 임계에도 안 걸림
        int sent = winBackService.sendWinBackForDay(LocalDateTime.now().plusDays(15));

        assertThat(sent).isZero();
        verify(notificationService, never()).notifyWinBack(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    @DisplayName("D+30 초과 장기 휴면(폐업 추정)은 제외 — 스팸 방지")
    void noSendForLongDormant() {
        dormantOwner("wb_long@x.com");

        // D+60 — 7/30 임계 모두 지나 발송 안 됨
        int sent = winBackService.sendWinBackForDay(LocalDateTime.now().plusDays(60));

        assertThat(sent).isZero();
        verify(notificationService, never()).notifyWinBack(org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    @DisplayName("휴면이 아닌 활성 사장은 win-back 대상 아님")
    void noSendForActive() {
        User u = userRepository.save(new User("wb_active@x.com", "u"));
        u.setUserGrade(UserGrade.MASTER);
        Subscription s = Subscription.pending(u, PlanType.FREE, BillingCycle.MONTHLY, "cust_active");
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(s); // dormantAt = null

        int sent = winBackService.sendWinBackForDay(LocalDateTime.now().plusDays(7));

        assertThat(sent).isZero();
        verify(notificationService, never()).notifyWinBack(org.mockito.ArgumentMatchers.anyLong());
    }
}
