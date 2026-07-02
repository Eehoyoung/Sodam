package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 임금대장 자료 (B8/L-NEW-03) — 근로기준법 §48① 임금대장.
 *
 * <p>그 달 매장 직원별 급여 항목(기본·연장·야간·휴일·주휴·총액·공제·실수령)을 산출한다.
 * 근로감독·체불진정 1순위 요구 서류. <b>참고용</b> — 법정 서식은 사장이 보완해야 한다.
 * 주민번호 미저장 — 이름+내부ID까지만(Hard No 준수).
 *
 * @param storeId       매장 id
 * @param year          귀속 연도
 * @param month         귀속 월
 * @param employeeCount 대상 인원
 * @param totalGross    총 지급액 합
 * @param totalDeduction 총 공제액 합
 * @param totalNet      총 실수령액 합
 * @param items         직원별 임금 라인
 * @param disclaimer    면책(참고용·법정 서식 보완 필요)
 */
public record WageLedgerResponse(
        Long storeId,
        int year,
        int month,
        int employeeCount,
        long totalGross,
        long totalDeduction,
        long totalNet,
        List<WageLine> items,
        String disclaimer
) {
    /**
     * 직원별 임금 항목. 같은 달 여러 급여건이 있으면 합산된 값.
     *
     * @param employeeId       내부 직원 id
     * @param employeeName     직원 이름
     * @param regularWage      기본 근무 급여
     * @param overtimeWage     연장(초과) 근무 급여(§56①)
     * @param nightWorkWage    야간 근무 급여(§56③)
     * @param holidayWorkWage  휴일 근무 급여(§56②)
     * @param weeklyAllowance  주휴수당(§55)
     * @param grossWage        총 지급액(세전)
     * @param deduction        공제 총액(원천징수세액 + 기타 공제)
     * @param netWage          실수령액(세후)
     */
    public record WageLine(
            Long employeeId,
            String employeeName,
            long regularWage,
            long overtimeWage,
            long nightWorkWage,
            long holidayWorkWage,
            long weeklyAllowance,
            long grossWage,
            long deduction,
            long netWage
    ) {
    }
}
