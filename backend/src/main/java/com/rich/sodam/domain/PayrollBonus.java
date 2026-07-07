package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BonusPaymentTiming;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 즉시 보너스(비정기 포상금) — "오늘 바빠서 1만원 더 드릴게요" 같은 사장의 즉흥 지급 결정을 기록한다.
 *
 * <p>정책 근거:
 * <ul>
 *   <li>근로소득 과세 대상 — 매장의 세금정책(3.3% 원천징수 또는 4대보험)을 그대로 적용해 급여에 합산될 때 원천징수한다.</li>
 *   <li>통상임금 불산입 — 정기·일률 지급이 아닌 임시·포상적 금품이므로 연장·야간·휴일 가산수당 산정 기준(통상임금)에는 포함하지 않는다.</li>
 *   <li>최저임금 불산입 — 최저임금법 §6④, 부정기 상여금은 최저임금 산입범위에서 제외되므로 시급 적정성 판정에 영향 없다.</li>
 *   <li>평균임금(퇴직금) 참고 — 근로기준법 시행령 §2 상 근로의 대가성이 있어 퇴직 전 3개월 평균임금 산정 시 원칙적으로 포함 대상이나,
 *       본 기능은 자동 반영하지 않고 사장 조회 화면에 안내 문구로만 고지한다(향후 과제).</li>
 * </ul>
 * </p>
 */
@Entity
@Table(name = "payroll_bonus", indexes = {
        @Index(name = "idx_payroll_bonus_emp_store_date", columnList = "employee_id, store_id, bonus_date"),
        @Index(name = "idx_payroll_bonus_store_id", columnList = "store_id")
})
@Getter
@Setter
@NoArgsConstructor
public class PayrollBonus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_bonus_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 보너스를 주기로 한 날(근무일 기준 — 급여 정산 시 이 날짜가 속한 기간의 정산에 자동 합산). */
    @Column(name = "bonus_date", nullable = false)
    private LocalDate bonusDate;

    /** 보너스 금액(원, 양수만). */
    @Column(nullable = false)
    private Integer amount;

    /** 지급 사유(예: "오늘 마감 도와줘서 감사 보너스"). */
    @Column(length = 300)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_timing", nullable = false, length = 30)
    private BonusPaymentTiming paymentTiming;

    /**
     * 이 보너스가 반영된 급여(Payroll) id. 급여 정산 시 INCLUDED_IN_PAYROLL 건만 자동 합산되며,
     * 합산되는 순간 이 필드가 채워져 다음 정산에서 중복 합산되지 않는다(멱등).
     */
    @Column(name = "included_in_payroll_id")
    private Long includedInPayrollId;

    /** 지급을 등록한 사장(User.id). */
    @Column(name = "created_by_master_id", nullable = false)
    private Long createdByMasterId;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public boolean isConsumed() {
        return includedInPayrollId != null;
    }
}
