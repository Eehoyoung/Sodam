package com.rich.sodam.dto.response;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.type.PayrollStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 급여 명세서 정보를 전달하기 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollDto {
    private Long id;

    // 직원 정보
    private Long employeeId;
    private String employeeName;

    // 매장 정보
    private Long storeId;
    private String storeName;

    // 급여 기간
    private LocalDate startDate;
    private LocalDate endDate;

    // 근무 시간
    private Double regularHours;
    private Double overtimeHours;
    private Double nightWorkHours;
    private Double totalHours;

    // 급여 금액
    private Integer baseHourlyWage;
    private Integer regularWage;
    private Integer overtimeWage;
    private Integer nightWorkWage;
    private Integer weeklyAllowance;
    private Integer grossWage;

    // 세금 및 공제
    private Double taxRate;
    private Integer taxAmount;
    private Integer deductions;

    // 최종 급여
    private Integer netWage;

    // 급여 상태
    private PayrollStatus status;

    // 급여 지급일
    private LocalDate paymentDate;

    // 취소 사유 (상태가 CANCELLED인 경우)
    private String cancelReason;


    // 생성/수정일
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Payroll 엔티티를 DTO로 변환
     */
    public static PayrollDto from(Payroll payroll) {
        if (payroll == null) {
            return null;
        }

        return PayrollDto.builder()
                .id(payroll.getId())
                .employeeId(payroll.getEmployee().getId())
                .employeeName(payroll.getEmployee().getUser().getName())
                .storeId(payroll.getStore().getId())
                .storeName(payroll.getStore().getStoreName())
                .startDate(payroll.getStartDate())
                .endDate(payroll.getEndDate())
                .regularHours(payroll.getRegularHours())
                .overtimeHours(payroll.getOvertimeHours())
                .nightWorkHours(payroll.getNightWorkHours())
                .totalHours(payroll.getRegularHours() + payroll.getOvertimeHours() + payroll.getNightWorkHours())
                .baseHourlyWage(payroll.getBaseHourlyWage())
                .regularWage(payroll.getRegularWage())
                .overtimeWage(payroll.getOvertimeWage())
                .nightWorkWage(payroll.getNightWorkWage())
                .weeklyAllowance(payroll.getWeeklyAllowance())
                .grossWage(payroll.getGrossWage())
                .taxRate(payroll.getTaxRate())
                .taxAmount(payroll.getTaxAmount())
                .deductions(payroll.getDeductions())
                .netWage(payroll.getNetWage())
                .status(payroll.getStatus())
                .paymentDate(payroll.getPaymentDate())
                .createdAt(payroll.getCreatedAt())
                .updatedAt(payroll.getUpdatedAt())
                .build();
    }
}