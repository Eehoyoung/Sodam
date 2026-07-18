package com.rich.sodam.repository;

import com.rich.sodam.domain.StoreDelegationAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreDelegationAuditRepository extends JpaRepository<StoreDelegationAudit, Long> {
    List<StoreDelegationAudit> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    Page<StoreDelegationAudit> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);
    List<StoreDelegationAudit> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
