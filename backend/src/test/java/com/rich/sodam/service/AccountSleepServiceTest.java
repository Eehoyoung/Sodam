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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 90일 슬립 배치 — 비활성 무료 계정만 휴면 처리, 유료는 제외, 멱등.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AccountSleepServiceTest {

    @Autowired private AccountSleepService accountSleepService;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private UserRepository userRepository;

    private Subscription activeSub(String email, PlanType plan) {
        User u = userRepository.save(new User(email, "u"));
        u.setUserGrade(UserGrade.MASTER);
        Subscription s = Subscription.pending(u, plan, BillingCycle.MONTHLY, "cust_" + email);
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        return subscriptionRepository.save(s);
    }

    @Test
    @DisplayName("90일 비활성 무료 계정만 휴면 처리, 유료는 제외")
    void sleepsOnlyDormantFree() {
        Subscription free = activeSub("sleep_free@x.com", PlanType.FREE);
        Subscription pro = activeSub("sleep_pro@x.com", PlanType.PRO);

        // asOf 를 91일 후로 줘서 updatedAt(now) 가 cutoff(now+1) 이전이 되게 함
        int slept = accountSleepService.sleepDormantFreeSubscriptions(LocalDateTime.now().plusDays(91), 90);
        assertThat(slept).isEqualTo(1);

        assertThat(subscriptionRepository.findById(free.getId()).orElseThrow().isDormant()).isTrue();
        assertThat(subscriptionRepository.findById(pro.getId()).orElseThrow().isDormant()).isFalse();
    }

    @Test
    @DisplayName("아직 90일 안 된 계정은 휴면 안 됨")
    void notYetInactive() {
        activeSub("sleep_recent@x.com", PlanType.FREE);
        int slept = accountSleepService.sleepDormantFreeSubscriptions(LocalDateTime.now().plusDays(10), 90);
        assertThat(slept).isZero();
    }

    @Test
    @DisplayName("재실행해도 이미 휴면이면 다시 세지 않음(멱등)")
    void idempotent() {
        activeSub("sleep_idem@x.com", PlanType.FREE);
        LocalDateTime asOf = LocalDateTime.now().plusDays(91);
        assertThat(accountSleepService.sleepDormantFreeSubscriptions(asOf, 90)).isEqualTo(1);
        assertThat(accountSleepService.sleepDormantFreeSubscriptions(asOf, 90)).isZero();
    }
}
