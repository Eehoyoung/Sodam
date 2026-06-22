package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {

    List<EmployeeDocument> findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);

    List<EmployeeDocument> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    /** 매장 만료 임박/도래(만료일 <= 기준일) — 임박 배너·목록용. */
    List<EmployeeDocument> findByStoreIdAndExpiresAtLessThanEqualOrderByExpiresAtAsc(Long storeId, LocalDate to);

    /** 전 매장 만료 임박/도래 스캔(스케줄러). expiresAt <= to. */
    List<EmployeeDocument> findByExpiresAtLessThanEqual(LocalDate to);
}
