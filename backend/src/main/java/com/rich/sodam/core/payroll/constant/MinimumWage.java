package com.rich.sodam.core.payroll.constant;

import java.math.BigDecimal;
import java.util.Map;
import java.util.TreeMap;

/**
 * 최저임금 (최저임금법 §6·§28).
 *
 * <p>연도별 시간급 최저임금을 보관하고 미달 여부를 판정한다. 노동법 개정/매년 고시 대비해
 * 계산 로직과 분리. 신규 연도 고시 시 {@link #HOURLY_BY_YEAR} 에 추가하기만 하면 된다.</p>
 *
 * <p>출처:
 * <ul>
 *   <li>2026년: 시간급 10,320원 — 고용노동부 고시 제2025-47호(2025.08.05), 적용 2026.01.01~12.31</li>
 *   <li>2025년: 시간급 10,030원</li>
 * </ul>
 * 수습근로자(1년 이상 계약 + 수습 3개월 이내, 단순노무 제외)는 90% 감액 가능(§5②, 시행령 §3).</p>
 */
public final class MinimumWage {

    private MinimumWage() {
    }

    /** 월 환산 기준시간 (주40h 소정 + 주휴8h → 209시간). */
    public static final BigDecimal MONTHLY_STANDARD_HOURS = new BigDecimal("209");

    /** 수습 감액률 (최저임금의 90%). 단순노무 종사자 제외, 1년 이상 계약·수습 3개월 이내만. */
    public static final BigDecimal PROBATION_RATIO = new BigDecimal("0.90");

    /** 연도별 시간급 최저임금(원). 신규 고시 시 추가. */
    private static final Map<Integer, BigDecimal> HOURLY_BY_YEAR = new TreeMap<>(Map.of(
            2024, new BigDecimal("9860"),
            2025, new BigDecimal("10030"),
            2026, new BigDecimal("10320")
    ));

    /** 해당 연도의 시간급 최저임금. 미등록 연도는 가장 최근 등록값으로 폴백(보수적). */
    public static BigDecimal hourlyFor(int year) {
        BigDecimal exact = HOURLY_BY_YEAR.get(year);
        if (exact != null) {
            return exact;
        }
        // 미등록 연도 → 가장 최근(최대 연도) 값 폴백 + 갱신 필요 신호는 호출측 로깅 권장
        return ((TreeMap<Integer, BigDecimal>) HOURLY_BY_YEAR).lastEntry().getValue();
    }

    /** 해당 시급이 해당 연도 최저임금 이상인지. (수습 감액 미고려 — 일반 근로자 기준) */
    public static boolean isAtLeastMinimum(int hourlyWage, int year) {
        return BigDecimal.valueOf(hourlyWage).compareTo(hourlyFor(year)) >= 0;
    }
}
