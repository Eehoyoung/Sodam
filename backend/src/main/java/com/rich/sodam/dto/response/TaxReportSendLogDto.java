package com.rich.sodam.dto.response;

import com.rich.sodam.domain.TaxReportSendLog;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 세무사 인건비 내역서 발송 이력 응답 DTO (엔티티 직접 반환 금지 — 필드 선별)
 */
public record TaxReportSendLogDto(
        Long id,
        LocalDate periodStart,
        LocalDate periodEnd,
        String recipientEmail,
        Integer payrollCount,
        Long totalGrossWage,
        String status,
        String failReason,
        LocalDateTime sentAt
) {
    public static TaxReportSendLogDto from(TaxReportSendLog log) {
        return new TaxReportSendLogDto(
                log.getId(),
                log.getPeriodStart(),
                log.getPeriodEnd(),
                log.getRecipientEmail(),
                log.getPayrollCount(),
                log.getTotalGrossWage(),
                log.getStatus() == null ? null : log.getStatus().name(),
                log.getFailReason(),
                log.getSentAt()
        );
    }
}
