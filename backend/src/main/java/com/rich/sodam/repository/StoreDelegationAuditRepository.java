package com.rich.sodam.repository;

import com.rich.sodam.domain.StoreDelegationAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoreDelegationAuditRepository extends JpaRepository<StoreDelegationAudit, Long> {
    List<StoreDelegationAudit> findByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<StoreDelegationAudit> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
