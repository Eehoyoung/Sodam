package com.rich.sodam.repository;

import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.domain.type.PaymentSourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentReceiptRepository extends JpaRepository<PaymentReceipt, Long> {
    Optional<PaymentReceipt> findBySourceTypeAndSourceOrderId(PaymentSourceType sourceType, String sourceOrderId);
    List<PaymentReceipt> findByOwnerUserIdOrderByCreatedAtDesc(Long ownerUserId);
}
