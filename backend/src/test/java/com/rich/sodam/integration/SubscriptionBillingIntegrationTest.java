package com.rich.sodam.integration;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.PaymentHistoryRepository;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.SubscriptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 정기결제 멱등성 통합 테스트 (🔴 결제 버그 수정 검증).
 *
 * 같은 청구년월에 이미 성공 결제가 있으면, 배치가 다시 돌아도 이중청구하지 않고 기간만 전진한다.
 * (과거: orderId 가 매회 millis 라 재실행 시 중복 결제 행이 쌓였음)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SubscriptionBillingIntegrationTest {

    @Autowired private SubscriptionService subscriptionService;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PaymentHistoryRepository paymentHistoryRepository;
    @Autowired private UserRepository userRepository;

    private User owner() {
        User u = new User("billing_owner@example.com", "사장님");
        u.setUserGrade(UserGrade.MASTER);
        return userRepository.save(u);
    }

    @Test
    @DisplayName("동일 청구년월 재배치 → 이중청구 없이 결제 1건만 유지(멱등성)")
    void rebillSamePeriodIsIdempotent() {
        User user = owner();

        Subscription sub = subscriptionService.subscribe(user.getId(), PlanType.PRO, "MOCK_AUTH");
        long afterFirstCharge = paymentHistoryRepository
                .findBySubscription_IdOrderByBilledAtDesc(sub.getId()).size();
        assertThat(afterFirstCharge).isEqualTo(1); // 첫 청구 1건

        // 미래 시점으로 배치 강제 실행 → nextBillingAt 도래로 청구 시도되지만
        // 같은 실제 청구년월(YearMonth.now())에 이미 SUCCESS 가 있으므로 멱등 스킵.
        subscriptionService.runScheduledBilling(LocalDateTime.now().plusMonths(2));

        long afterRebill = paymentHistoryRepository
                .findBySubscription_IdOrderByBilledAtDesc(sub.getId()).size();
        assertThat(afterRebill).isEqualTo(afterFirstCharge); // 결제행 증가 없음

        Subscription reloaded = subscriptionRepository.findById(sub.getId()).orElseThrow();
        assertThat(reloaded.isActive()).isTrue();
    }

    @Test
    @DisplayName("PRO 월납 첫 청구 금액은 19,900원")
    void firstChargeAmountMatchesPlan() {
        User user = owner();
        Subscription sub = subscriptionService.subscribe(user.getId(), PlanType.PRO, "MOCK_AUTH");

        var payments = paymentHistoryRepository.findBySubscription_IdOrderByBilledAtDesc(sub.getId());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getAmount()).isEqualTo(19_900);
        assertThat(payments.get(0).getBillingPeriod()).isNotNull();
    }
}
