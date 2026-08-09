package com.rich.sodam.repository;

import com.rich.sodam.domain.PaymentRefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRefundRequestRepository extends JpaRepository<PaymentRefundRequest, Long> {
    List<PaymentRefundRequest> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);
    List<PaymentRefundRequest> findBySourceTypeAndSourceOrderIdOrderByCreatedAtDesc(
            com.rich.sodam.domain.type.PaymentSourceType sourceType, String sourceOrderId);
}
