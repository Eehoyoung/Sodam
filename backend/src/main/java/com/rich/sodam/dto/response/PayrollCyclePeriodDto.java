package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 매장 정산주기를 실제 날짜로 해석한 결과 — 정산 마법사의 기간 기본값·지급 예정일 표시용.
 * 주기가 미설정이면 configured=false 이고 날짜는 전부 null (FE 는 기존 달력 기본값 폴백).
 */
public record PayrollCyclePeriodDto(
        boolean configured,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate paymentDate
) {
    public static PayrollCyclePeriodDto notConfigured() {
        return new PayrollCyclePeriodDto(false, null, null, null);
    }
}
