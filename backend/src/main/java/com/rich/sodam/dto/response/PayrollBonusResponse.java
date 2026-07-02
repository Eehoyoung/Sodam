package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.type.BonusPaymentTiming;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 즉시 보너스 응답 DTO.
 *
 * @param consumed 급여 정산에 이미 반영됐는지(includedInPayrollId != null)
 */
public record PayrollBonusResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate bonusDate,
        Integer amount,
        String reason,
        BonusPaymentTiming paymentTiming,
        boolean consumed,
        Long includedInPayrollId,
        LocalDateTime createdAt
) {
    public static PayrollBonusResponse from(PayrollBonus b) {
        return new PayrollBonusResponse(
                b.getId(),
                b.getEmployeeId(),
                b.getStoreId(),
                b.getBonusDate(),
                b.getAmount(),
                b.getReason(),
                b.getPaymentTiming(),
                b.isConsumed(),
                b.getIncludedInPayrollId(),
                b.getCreatedAt()
        );
    }
}
