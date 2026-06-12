package com.rich.sodam.dto.response;

import com.rich.sodam.domain.WageHistory;

import java.time.LocalDate;

/**
 * 시급 변경 이력 응답. 매장 기본/직원 개별 시급 변경 내역.
 *
 * @param effectiveFrom 적용 시작일
 * @param hourlyWage    변경된 시급(원)
 * @param scope         STORE_DEFAULT / EMPLOYEE_OVERRIDE
 * @param reason        변경 사유
 */
public record WageHistoryDto(
        LocalDate effectiveFrom,
        int hourlyWage,
        String scope,
        String reason
) {
    public static WageHistoryDto from(WageHistory h) {
        return new WageHistoryDto(
                h.getEffectiveFrom(),
                h.getHourlyWage(),
                h.getScope() != null ? h.getScope().name() : null,
                h.getReason());
    }
}
