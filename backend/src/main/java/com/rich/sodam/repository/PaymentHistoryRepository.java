package com.rich.sodam.repository;

import com.rich.sodam.domain.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {

    Optional<PaymentHistory> findByOrderId(String orderId);

    Optional<PaymentHistory> findByPaymentKey(String paymentKey);

    List<PaymentHistory> findBySubscription_IdOrderByBilledAtDesc(Long subscriptionId);
}
