package com.rich.sodam.repository;

import com.rich.sodam.domain.ElectronicSignatureAccessAudit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ElectronicSignatureAccessAuditRepository extends JpaRepository<ElectronicSignatureAccessAudit, Long> {
}
