package com.rich.sodam.domain;

import com.rich.sodam.domain.type.DocumentType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * 직원 서류함 항목 (A5/M-NEW-01). 보건증·근로계약서·통장사본 등 보관 + 만료 경보.
 *
 * <p>PII 보호: 원본 파일·주민번호·계좌번호 미저장. {@code fileRef}(S3 키 등) 참조와
 * 만료 메타만. 보건증(1년 갱신 법정의무)은 만료 임박 시 사장에게 경보.
 */
@Entity
@Table(name = "employee_document", indexes = {
        @Index(name = "idx_emp_doc_emp_store", columnList = "employee_id, store_id"),
        @Index(name = "idx_emp_doc_expires", columnList = "expires_at"),
        @Index(name = "idx_employee_document_store_id", columnList = "store_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_document_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 30, nullable = false)
    private DocumentType type;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    /** 원본 파일 참조키(S3 등). 원본·PII 미저장. */
    @Column(name = "file_ref", length = 300)
    private String fileRef;

    @Column(name = "issued_at")
    private LocalDate issuedAt;

    @Column(name = "expires_at")
    private LocalDate expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private EmployeeDocument(Long employeeId, Long storeId, DocumentType type, String title,
                            String fileRef, LocalDate issuedAt, LocalDate expiresAt) {
        this.employeeId = employeeId;
        this.storeId = storeId;
        this.type = type;
        this.title = title;
        this.fileRef = fileRef;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public static EmployeeDocument create(Long employeeId, Long storeId, DocumentType type, String title,
                                          String fileRef, LocalDate issuedAt, LocalDate expiresAt) {
        return new EmployeeDocument(employeeId, storeId, type, title, fileRef, issuedAt, expiresAt);
    }

    /** 만료까지 남은 일수. 만료일 없으면 null. 음수면 이미 만료. */
    public Long daysUntilExpiry(LocalDate today) {
        if (expiresAt == null) {
            return null;
        }
        return ChronoUnit.DAYS.between(today, expiresAt);
    }

    /** 만료 상태: OK / EXPIRING(임박 임계 이내) / EXPIRED. 만료일 없으면 OK. */
    public String expiryStatus(LocalDate today, int expiringWithinDays) {
        Long days = daysUntilExpiry(today);
        if (days == null) {
            return "OK";
        }
        if (days < 0) {
            return "EXPIRED";
        }
        if (days <= expiringWithinDays) {
            return "EXPIRING";
        }
        return "OK";
    }
}
