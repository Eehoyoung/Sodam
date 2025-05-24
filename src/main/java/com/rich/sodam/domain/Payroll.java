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

    // 급여 금액 관련
    private Integer baseHourlyWage;       // 기본 시급
    private Integer regularWage;          // 기본 근무 급여
    private Integer overtimeWage;         // 초과 근무 급여
    private Integer nightWorkWage;        // 야간 근무 급여
    private Integer weeklyAllowance;      // 주휴수당
    private Integer grossWage;            // 총 급여 (세전)

    // 세금 및 공제
    private Double taxRate;               // 적용된 세율
    private Integer taxAmount;            // 세금 금액
    private Integer deductions;           // 기타 공제액

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
        this.netWage = this.grossWage - (this.taxAmount + (this.deductions != null ? this.deductions : 0));
    }

    /**
     * 총 급여 계산
     */
    public void calculateGrossWage() {
        int total = 0;
        if (this.regularWage != null) total += this.regularWage;
        if (this.overtimeWage != null) total += this.overtimeWage;
        if (this.nightWorkWage != null) total += this.nightWorkWage;
        if (this.weeklyAllowance != null) total += this.weeklyAllowance;

        this.grossWage = total;
    }
}