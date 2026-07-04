package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 세무사 인건비 내역서 발송 이력.
 * 언제/누구에게/어떤 정산기간 자료를 보냈는지 기록 — 중복 발송 확인 + 분쟁 시 증빙.
 * 수신 이메일은 발송 시점 스냅샷(이후 매장 설정이 바뀌어도 이력은 불변).
 */
@Entity
@Table(name = "tax_report_send_log", indexes = {
        @Index(name = "idx_trsl_store_period", columnList = "store_id, period_start, period_end")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaxReportSendLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tax_report_send_log_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "payroll_count", nullable = false)
    private Integer payrollCount;

    @Column(name = "total_gross_wage", nullable = false)
    private Long totalGrossWage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SendStatus status;

    @Column(name = "fail_reason", length = 500)
    private String failReason;

    /** 발송을 트리거한 사장 userId */
    @Column(name = "sent_by", nullable = false)
    private Long sentBy;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    public enum SendStatus {SENT, FAILED}

    public TaxReportSendLog(Store store, LocalDate periodStart, LocalDate periodEnd,
                            String recipientEmail, int payrollCount, long totalGrossWage,
                            SendStatus status, String failReason, Long sentBy) {
        this.store = store;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.recipientEmail = recipientEmail;
        this.payrollCount = payrollCount;
        this.totalGrossWage = totalGrossWage;
        this.status = status;
        this.failReason = failReason;
        this.sentBy = sentBy;
        this.sentAt = LocalDateTime.now();
    }
}
