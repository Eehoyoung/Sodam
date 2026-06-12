package com.rich.sodam.repository;

import com.rich.sodam.domain.PaymentHistory;
import com.rich.sodam.domain.PaymentHistory.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {

    Optional<PaymentHistory> findByOrderId(String orderId);

    Optional<PaymentHistory> findByPaymentKey(String paymentKey);

    List<PaymentHistory> findBySubscription_IdOrderByBilledAtDesc(Long subscriptionId);

    /** 멱등성: 동일 구독·동일 청구기간에 이미 성공 결제가 있는지. */
    boolean existsBySubscription_IdAndBillingPeriodAndStatus(
            Long subscriptionId, String billingPeriod, PaymentStatus status);

    /** 동일 구독·기간 내 결제 시도 횟수(orderId 충돌 회피용 attempt 번호 산정). */
    long countBySubscription_IdAndBillingPeriod(Long subscriptionId, String billingPeriod);
}
