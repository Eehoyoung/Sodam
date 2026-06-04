package com.rich.sodam.core.payroll.weeklyallowance;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * 주휴수당 산정 시 "1주(週)"의 기산(시작) 기준.
 *
 * <p>근로기준법 §2①7 "1주"는 7일을 의미하나 기산 요일을 법이 강제하지 않는다.
 * 취업규칙·근로계약으로 정할 수 있고, 정함이 없으면 통상 달력주(월~일) 또는 사업장 관행을 따른다.
 * 사업장·근무형태가 다양한 SaaS 특성상 정책을 선택 가능하게 둔다(시스템 core).</p>
 *
 * <p>⚠️ 기본값·월 경계 처리의 적법성은 노무·법률 검토 결과로 확정한다.</p>
 */
public enum WeekStartPolicy {

    /** 입사일 요일을 기산으로 7일 회전 (직원마다 주 시작 요일이 다름). */
    HIRE_DATE_ANCHORED,

    /** 월요일 고정 (ISO-8601 달력주, 월~일). */
    MONDAY,

    /** 일요일 고정 (일~토). */
    SUNDAY,

    /** 사업장이 취업규칙으로 정한 기산일. 미설정 시 {@link #MONDAY} 로 폴백. */
    STORE_DEFINED;

    /**
     * 주어진 근무일이 속한 주의 시작일을 정책에 따라 계산.
     *
     * @param workDate   근무일
     * @param hireAnchor 입사일(HIRE_DATE_ANCHORED 에서 기산점). 다른 정책은 무시. null 이면 MONDAY 로 폴백.
     */
    public LocalDate weekStartOf(LocalDate workDate, LocalDate hireAnchor) {
        return switch (this) {
            case MONDAY, STORE_DEFINED ->
                    workDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case SUNDAY ->
                    workDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
            case HIRE_DATE_ANCHORED -> {
                if (hireAnchor == null) {
                    yield workDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                }
                // 입사일로부터 경과일을 7로 나눈 몫만큼의 주 시작
                long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(hireAnchor, workDate);
                long weeks = Math.floorDiv(daysBetween, 7);
                yield hireAnchor.plusDays(weeks * 7);
            }
        };
    }
}
