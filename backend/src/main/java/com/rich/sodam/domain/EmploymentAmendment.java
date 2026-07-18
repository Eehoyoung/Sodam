package com.rich.sodam.domain;

import com.rich.sodam.domain.type.EmploymentAmendmentStatus;
import com.rich.sodam.domain.type.EmploymentType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employment_amendment", indexes = {
        @Index(name = "idx_employment_amendment_store", columnList = "store_id, status"),
        @Index(name = "idx_employment_amendment_due", columnList = "status, effective_date")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmploymentAmendment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "store_id", nullable = false) private Long storeId;
    @Column(name = "employee_id", nullable = false) private Long employeeId;
    @Column(name = "created_by_user_id", nullable = false) private Long createdByUserId;
    @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate;
    @Enumerated(EnumType.STRING) @Column(name = "employment_type", nullable = false, length = 30)
    private EmploymentType employmentType;
    @Column(name = "hourly_wage") private Integer hourlyWage;
    @Column(name = "monthly_salary") private Integer monthlySalary;
    @Column(name = "contracted_weekly_hours") private Double contractedWeeklyHours;
    @Column(name = "contracted_weekly_days") private Integer contractedWeeklyDays;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private EmploymentAmendmentStatus status;
    @Column(name = "electronic_signature_envelope_id") private Long electronicSignatureEnvelopeId;
    @Column(name = "document_version", nullable = false) private int documentVersion;
    @Column(name = "verified_at") private LocalDateTime verifiedAt;
    @Column(name = "applied_at") private LocalDateTime appliedAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Version @Column(nullable = false) private Long version;

    public static EmploymentAmendment draft(Long storeId, Long employeeId, Long createdByUserId,
                                             LocalDate effectiveDate, EmploymentType employmentType,
                                             Integer hourlyWage, Integer monthlySalary,
                                             Double weeklyHours, Integer weeklyDays) {
        if (storeId == null || employeeId == null || createdByUserId == null || effectiveDate == null
                || employmentType == null) {
            throw new IllegalArgumentException("근로조건 변경계약의 필수값이 누락되었습니다.");
        }
        EmploymentAmendment amendment = new EmploymentAmendment();
        amendment.storeId = storeId;
        amendment.employeeId = employeeId;
        amendment.createdByUserId = createdByUserId;
        amendment.effectiveDate = effectiveDate;
        amendment.employmentType = employmentType;
        amendment.hourlyWage = hourlyWage;
        amendment.monthlySalary = monthlySalary;
        amendment.contractedWeeklyHours = weeklyHours;
        amendment.contractedWeeklyDays = weeklyDays;
        amendment.status = EmploymentAmendmentStatus.DRAFT;
        amendment.createdAt = LocalDateTime.now();
        return amendment;
    }

    public void startSigning(Long envelopeId, int documentVersion) {
        if (status != EmploymentAmendmentStatus.DRAFT || envelopeId == null || documentVersion < 1) {
            throw new IllegalStateException("변경계약 전자서명을 시작할 수 없습니다.");
        }
        this.electronicSignatureEnvelopeId = envelopeId;
        this.documentVersion = documentVersion;
        this.status = EmploymentAmendmentStatus.SIGNING;
    }

    public void markVerified(Long envelopeId, int documentVersion, LocalDateTime verifiedAt) {
        if (status == EmploymentAmendmentStatus.VERIFIED || status == EmploymentAmendmentStatus.APPLIED) return;
        if (status != EmploymentAmendmentStatus.SIGNING
                || !java.util.Objects.equals(electronicSignatureEnvelopeId, envelopeId)
                || this.documentVersion != documentVersion) {
            throw new IllegalStateException("변경계약과 전자서명 봉투가 일치하지 않습니다.");
        }
        this.verifiedAt = verifiedAt == null ? LocalDateTime.now() : verifiedAt;
        this.status = EmploymentAmendmentStatus.VERIFIED;
    }

    public void markApplied(LocalDateTime appliedAt) {
        if (status != EmploymentAmendmentStatus.VERIFIED) {
            throw new IllegalStateException("검증 완료된 변경계약만 적용할 수 있습니다.");
        }
        this.appliedAt = appliedAt == null ? LocalDateTime.now() : appliedAt;
        this.status = EmploymentAmendmentStatus.APPLIED;
    }

    public void cancel() {
        if (status != EmploymentAmendmentStatus.DRAFT) {
            throw new IllegalStateException("서명이 시작된 변경계약은 취소 대신 재작성해야 합니다.");
        }
        status = EmploymentAmendmentStatus.CANCELLED;
    }
}
