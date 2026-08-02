package com.rich.sodam.repository;

import com.rich.sodam.domain.PaymentCancelReversalAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentCancelReversalAuditRepository extends JpaRepository<PaymentCancelReversalAudit, Long> {
    List<PaymentCancelReversalAudit> findByOrderIdOrderByCreatedAtDesc(String orderId);

    List<PaymentCancelReversalAudit> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);
}
