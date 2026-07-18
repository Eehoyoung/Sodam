package com.rich.sodam.dto.response;

import com.rich.sodam.domain.EmployeeDocument;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 직원 서류 응답 (A5). 만료 상태·남은 일수 포함.
 *
 * <p>{@code type == LABOR_CONTRACT} 인 항목은 서명 상태를 저장값 복제가 아니라
 * {@code labor_contract.employee_signed_at} 원본에서 매 조회 시 실시간으로 읽어와 채운다
 * (단일 소스 — 서류함 상태가 실제 서명 여부와 드리프트되지 않도록). 그 외 서류 종류는
 * 세 필드 모두 null.
 *
 * @param expiryStatus       "OK" | "EXPIRING" | "EXPIRED"
 * @param daysUntilExpiry    만료까지 남은 일수(만료일 없으면 null)
 * @param contractId         연동된 근로계약서 id (LABOR_CONTRACT 아니거나 원본을 찾을 수 없으면 null)
 * @param contractSigned     근로계약서 서명완료 여부 (위와 동일 조건에서만 값 존재)
 * @param contractSignedAt   근로계약서 서명 시각 (위와 동일 조건에서만 값 존재)
 */
public record EmployeeDocumentResponse(
        Long id,
        Long employeeId,
        Long storeId,
        String type,
        String typeLabel,
        String title,
        String fileRef,
        LocalDate issuedAt,
        LocalDate expiresAt,
        String expiryStatus,
        Long daysUntilExpiry,
        Long contractId,
        Boolean contractSigned,
        LocalDateTime contractSignedAt
) {
    public static final int EXPIRING_WITHIN_DAYS = 30;

    public static EmployeeDocumentResponse from(EmployeeDocument d, LocalDate today) {
        return from(d, today, null, null, null);
    }

    public static EmployeeDocumentResponse from(
            EmployeeDocument d, LocalDate today,
            Long contractId, Boolean contractSigned, LocalDateTime contractSignedAt) {
        return new EmployeeDocumentResponse(
                d.getId(),
                d.getEmployeeId(),
                d.getStoreId(),
                d.getType() != null ? d.getType().name() : null,
                d.getType() != null ? d.getType().getLabel() : null,
                d.getTitle(),
                d.getFileRef(),
                d.getIssuedAt(),
                d.getExpiresAt(),
                d.expiryStatus(today, EXPIRING_WITHIN_DAYS),
                d.daysUntilExpiry(today),
                contractId,
                contractSigned,
                contractSignedAt);
    }
}
