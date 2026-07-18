package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.domain.type.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {

    List<EmployeeDocument> findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(Long employeeId, Long storeId);

    List<EmployeeDocument> findByStoreIdOrderByCreatedAtDesc(Long storeId);

    /** 동일 참조(fileRef)로 이미 등록된 서류가 있는지 — 근로계약서 자동 연동 멱등성 체크용. */
    Optional<EmployeeDocument> findByEmployeeIdAndStoreIdAndTypeAndFileRef(
            Long employeeId, Long storeId, DocumentType type, String fileRef);

    /** 매장 만료 임박/도래(만료일 <= 기준일) — 임박 배너·목록용. */
    List<EmployeeDocument> findByStoreIdAndExpiresAtLessThanEqualOrderByExpiresAtAsc(Long storeId, LocalDate to);

    /** 전 매장 만료 임박/도래 스캔(스케줄러). expiresAt <= to. */
    List<EmployeeDocument> findByExpiresAtLessThanEqual(LocalDate to);
}
