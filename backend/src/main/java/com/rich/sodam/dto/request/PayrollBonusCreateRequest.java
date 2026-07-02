package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.BonusPaymentTiming;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * 즉시 보너스 등록 요청(사장). 예: "오늘 바빠서 고생한 직원에게 1만원 추가 지급".
 *
 * @param employeeId     대상 직원 id
 * @param bonusDate      지급 결정일(근무일 기준)
 * @param amount         보너스 금액(원, 0보다 커야 함)
 * @param reason         지급 사유(선택)
 * @param paymentTiming  즉시 현금 지급(IMMEDIATE_CASH) / 다음 급여 합산(INCLUDED_IN_PAYROLL)
 */
public record PayrollBonusCreateRequest(
        @NotNull Long employeeId,
        @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bonusDate,
        @NotNull @Positive Integer amount,
        String reason,
        @NotNull BonusPaymentTiming paymentTiming
) {
}
