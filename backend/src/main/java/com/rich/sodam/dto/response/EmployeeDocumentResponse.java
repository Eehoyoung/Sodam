package com.rich.sodam.dto.response;

import com.rich.sodam.domain.EmployeeDocument;

import java.time.LocalDate;

/**
 * 직원 서류 응답 (A5). 만료 상태·남은 일수 포함.
 *
 * @param expiryStatus    "OK" | "EXPIRING" | "EXPIRED"
 * @param daysUntilExpiry 만료까지 남은 일수(만료일 없으면 null)
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
        Long daysUntilExpiry
) {
    public static final int EXPIRING_WITHIN_DAYS = 30;

    public static EmployeeDocumentResponse from(EmployeeDocument d, LocalDate today) {
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
                d.daysUntilExpiry(today));
    }
}
