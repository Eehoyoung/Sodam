package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.type.TaxPolicyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 급여 정책 정보를 전달하기 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollPolicyDto {
    private Long id;
    private Long storeId;
    private String storeName;
    private TaxPolicyType taxPolicyType;
    private Double nightWorkRate;
    private LocalTime nightWorkStartTime;
    private Double overtimeRate;
    private Double regularHoursPerDay;
    private Boolean weeklyAllowanceEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * PayrollPolicy 엔티티를 DTO로 변환
     */
    public static PayrollPolicyDto from(PayrollPolicy policy) {
        if (policy == null) {
            return null;
        }

        return PayrollPolicyDto.builder()
                .id(policy.getId())
                .storeId(policy.getStore().getId())
                .storeName(policy.getStore().getStoreName())
                .taxPolicyType(policy.getTaxPolicyType())
                .nightWorkRate(policy.getNightWorkRate())
                .nightWorkStartTime(policy.getNightWorkStartTime())
                .overtimeRate(policy.getOvertimeRate())
                .regularHoursPerDay(policy.getRegularHoursPerDay())
                .weeklyAllowanceEnabled(policy.getWeeklyAllowanceEnabled())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}