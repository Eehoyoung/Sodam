package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PayrollStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 급여 명세서 엔티티
 */
@Entity
@Table(name = "payroll")
@Getter
@Setter
@NoArgsConstructor
public class Payroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payroll_id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employee;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    // 급여 기간
    private LocalDate startDate;
    private LocalDate endDate;

    // 근무 시간 관련
    private Double regularHours;    // 기본 근무 시간
    private Double overtimeHours;   // 초과 근무 시간
    private Double nightWorkHours;  // 야간 근무 시간
    private Double holidayWorkHours; // 휴일 근무 시간(§56②)

    // 급여 금액 관련
    private Integer baseHourlyWage;       // 기본 시급
    private Integer regularWage;          // 기본 근무 급여
    private Integer overtimeWage;         // 초과 근무 급여
    private Integer nightWorkWage;        // 야간 근무 급여
    private Integer holidayWorkWage;      // 휴일 근무 급여(§56②)
    private Integer weeklyAllowance;      // 주휴수당
    /**
     * 주휴 환산 시간(유급으로 처리한 시간 수).
     *
     * <p>주휴수당이 시행령 §27조의2 의 "정액 수당" 예외에 해당하는지는 확정되지 않았다
     * (RELEASE_GATES G-9 각주). 예외가 아니라면 시간 수 기재가 필요하므로 안전한 쪽으로 보관한다.</p>
     */
    private Double weeklyAllowanceHours;

    /**
     * 주 40시간 초과 연장근로 시간 수(§56①). 일 8시간 초과로 이미 가산된 시간은 제외한 순증분.
     *
     * <p>금액만 두지 않고 시간 수를 함께 보관한다 — 시행령 §27조의2 가 연장근로에 대해 "그 시간
     * 수"를 임금명세서에 적도록 요구하고, 정액 수당이 아닌 변동 항목에는 예외가 없다.</p>
     */
    private Double weeklyOvertimeHours;
    /** 위 시간에 대한 가산분(50%)만. 기본 100%는 정상근로 임금·월급에 이미 포함돼 있다. */
    private Integer weeklyOvertimeWage;

    private Integer bonusWage;            // 즉시 보너스 합산액(PayrollBonus, INCLUDED_IN_PAYROLL 건만)
    private Integer grossWage;            // 총 급여 (세전)

    // 세금 및 공제
    private Double taxRate;               // 적용된 세율
    private Integer taxAmount;            // 세금/공제 총액 (3.3% 원천징수 또는 4대보험 합계)
    private Integer deductions;           // 기타 공제액

    // 임금명세서(§48②) 항목별 공제내역 — 4대보험 정책일 때 채워짐. 3.3% 정책은 taxAmount(소득세)만 사용.
    private Integer nationalPensionDeduction;  // 국민연금
    private Integer healthInsuranceDeduction;  // 건강보험
    private Integer longTermCareDeduction;     // 장기요양
    private Integer employmentInsuranceDeduction; // 고용보험

    /**
     * 가감조정액(원). 사장이 정산 마법사에서 직접 넣는 ±금액으로, 세후 가산이다(C-3, 2026-08-18 확정) —
     * grossWage·taxAmount·4대보험·주휴수당 계산에는 영향을 주지 않는다.
     */
    private Integer adjustment;
    /** 가감조정 사유. 조정액이 0이 아니면 필수(§48② 항목별 지급/공제내역에 표기된다). */
    @Column(length = 200)
    private String adjustmentReason;

    // 최종 급여
    private Integer netWage;              // 실수령액 (세후)

    // 급여 상태
    @Enumerated(EnumType.STRING)
    private PayrollStatus status = PayrollStatus.DRAFT;

    // 급여 지급일
    private LocalDate paymentDate;

    // 취소 사유 (상태가 CANCELLED인 경우)
    private String cancelReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** 낙관적 락(웹 콘솔·모바일 동시 편집/중복 확정 충돌 감지용, 06_DB_마이그레이션계획.md §2.1). */
    @Version
    @Column(nullable = false)
    private Long version;

    /**
     * 세금 계산
     */
    public void calculateTax(double taxRate) {
        this.taxRate = taxRate;
        this.taxAmount = (int) Math.round(this.grossWage * taxRate);
    }

    /**
     * 순 급여 계산
     */
    public void calculateNetWage() {
        this.netWage = this.grossWage - (this.taxAmount + (this.deductions != null ? this.deductions : 0))
                + (this.adjustment != null ? this.adjustment : 0);
    }

    /**
     * 가감조정을 적용하고 실수령액을 다시 계산한다(세후 가산).
     *
     * @throws IllegalArgumentException 조정 후 실수령액이 음수가 되는 경우 — 급여보다 큰 차감은
     *                                  임금 상계 한도(근로기준법 §43 전액지급 원칙) 문제라 막는다.
     */
    public void applyAdjustment(Integer amount, String reason) {
        this.adjustment = (amount == null || amount == 0) ? null : amount;
        this.adjustmentReason = this.adjustment == null ? null : reason;
        calculateNetWage();
        if (this.netWage < 0) {
            throw new IllegalArgumentException("가감조정 후 실수령액이 음수가 될 수 없습니다.");
        }
    }

    /**
     * 총 급여 계산
     */
    public void calculateGrossWage() {
        int total = 0;
        if (this.regularWage != null) total += this.regularWage;
        if (this.overtimeWage != null) total += this.overtimeWage;
        if (this.nightWorkWage != null) total += this.nightWorkWage;
        if (this.holidayWorkWage != null) total += this.holidayWorkWage;
        if (this.weeklyAllowance != null) total += this.weeklyAllowance;
        if (this.weeklyOvertimeWage != null) total += this.weeklyOvertimeWage;
        if (this.bonusWage != null) total += this.bonusWage;

        this.grossWage = total;
    }
}