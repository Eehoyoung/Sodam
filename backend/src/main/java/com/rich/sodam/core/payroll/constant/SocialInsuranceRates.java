package com.rich.sodam.core.payroll.constant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.NavigableMap;
import java.util.TreeMap;

/**
 * 4대보험 근로자 부담 요율 (2026 적용).
 *
 * <p>⚠️ 계산 주의:
 * <ul>
 *   <li>국민연금: 기준소득월액 상·하한 캡 적용 후 요율. (상·하한은 매년 7.1 갱신)</li>
 *   <li>장기요양보험: <b>건강보험료액</b>에 곱한다(보수월액 아님). 2단계 계산 필수.</li>
 *   <li>산재보험: 전액 사업주 부담 — 근로자 공제 없음(요율 0).</li>
 * </ul></p>
 *
 * <p>출처(2026.01.01 시행):
 * <ul>
 *   <li>국민연금 9.5%(근로자 4.75%) — 보건복지부, 2026.01.01 단계 인상 1년차</li>
 *   <li>건강보험 7.19%(근로자 3.595%), 장기요양 = 건강보험료 × (0.9448/7.19)</li>
 *   <li>고용보험(실업급여) 근로자 0.9%</li>
 *   <li>국민연금 기준소득월액 하한 41만/상한 659만 (2026.07~2027.06 적용분)</li>
 * </ul>
 * 4대보험 공단 모의계산(4insure.or.kr) 및 공시 교차확인.</p>
 */
public final class SocialInsuranceRates {

    private SocialInsuranceRates() {
    }

    /** 국민연금 근로자 부담률 (총 9.5%의 1/2). */
    public static final BigDecimal NATIONAL_PENSION_EMPLOYEE = new BigDecimal("0.0475");

    /**
     * 국민연금 기준소득월액 상·하한은 매년 7.1 갱신(적용기간 7.1~익년 6.30)되어 연도 분기가 필요하다.
     * 적용 <b>시작일</b>을 키로, [하한, 상한] 캡을 값으로 보관한다. 갱신 시 추정 없이 공시값을 한 줄 추가만 하면 된다.
     *
     * <p>현재 등재:
     * <ul>
     *   <li>2025.07.01~2026.06.30: 하한 40만 / 상한 637만</li>
     *   <li>2026.07.01~2027.06.30: 하한 41만 / 상한 659만</li>
     * </ul>
     */
    private static final NavigableMap<LocalDate, BigDecimal[]> PENSION_BASE_CAPS_BY_EFFECTIVE_DATE = buildPensionBaseCaps();

    private static NavigableMap<LocalDate, BigDecimal[]> buildPensionBaseCaps() {
        NavigableMap<LocalDate, BigDecimal[]> m = new TreeMap<>();
        m.put(LocalDate.of(2025, 7, 1),
                new BigDecimal[]{new BigDecimal("400000"), new BigDecimal("6370000")});
        m.put(LocalDate.of(2026, 7, 1),
                new BigDecimal[]{new BigDecimal("410000"), new BigDecimal("6590000")});
        return m;
    }

    /**
     * 주어진 일자에 적용되는 국민연금 기준소득월액 하한(원).
     * 해당 일자 이전 가장 가까운 적용분을 사용(연도 분기). 등재 전 일자는 최초 등재분으로 폴백.
     */
    public static BigDecimal pensionBaseMin(LocalDate onDate) {
        return capsFor(onDate)[0];
    }

    /** 주어진 일자에 적용되는 국민연금 기준소득월액 상한(원). {@link #pensionBaseMin(LocalDate)} 참고. */
    public static BigDecimal pensionBaseMax(LocalDate onDate) {
        return capsFor(onDate)[1];
    }

    private static BigDecimal[] capsFor(LocalDate onDate) {
        var entry = PENSION_BASE_CAPS_BY_EFFECTIVE_DATE.floorEntry(onDate);
        if (entry == null) {
            entry = PENSION_BASE_CAPS_BY_EFFECTIVE_DATE.firstEntry();
        }
        return entry.getValue();
    }

    /** 건강보험 근로자 부담률 (총 7.19%의 1/2). */
    public static final BigDecimal HEALTH_EMPLOYEE = new BigDecimal("0.03595");
    /** 장기요양보험료 = 건강보험료액 × 이 비율 (0.9448/7.19). 보수월액 아님에 주의. */
    public static final BigDecimal LTC_ON_HEALTH_PREMIUM = new BigDecimal("0.13139");

    /** 고용보험(실업급여) 근로자 부담률. */
    public static final BigDecimal EMPLOYMENT_EMPLOYEE = new BigDecimal("0.009");

    /** 산재보험 근로자 부담률(없음 — 전액 사업주). */
    public static final BigDecimal INDUSTRIAL_ACCIDENT_EMPLOYEE = BigDecimal.ZERO;

    /* ==================== 사업주 부담 요율 (채용 총비용 시뮬레이터용) ==================== */

    /** 국민연금 사업주 부담률 (총 9.5%의 1/2 — 근로자와 동률). */
    public static final BigDecimal NATIONAL_PENSION_EMPLOYER = new BigDecimal("0.0475");

    /** 건강보험 사업주 부담률 (총 7.19%의 1/2 — 근로자와 동률). 장기요양은 건강보험료액 × {@link #LTC_ON_HEALTH_PREMIUM} 별도. */
    public static final BigDecimal HEALTH_EMPLOYER = new BigDecimal("0.03595");

    /**
     * 고용보험 사업주 부담률 = 실업급여 0.9% + 고용안정·직업능력개발 0.25%(상시 150인 미만 사업장 기준).
     * 근로자 부담(0.9%)과 다름에 주의 — 고용안정·직능개발분은 전액 사업주.
     */
    public static final BigDecimal EMPLOYMENT_EMPLOYER = new BigDecimal("0.0115");

    /**
     * 산재보험 사업주 부담률 — 전액 사업주. 요율은 업종별로 크게 다르므로(음식·소매 등 0.7~1%대,
     * 건설·제조 수 %대) 전 업종 평균 요율(출퇴근재해 포함 1.47%)로 개략 추정한다.
     * 시뮬레이터 전용 근사치 — 실제 고지액은 근로복지공단 업종요율이 최종.
     */
    public static final BigDecimal INDUSTRIAL_ACCIDENT_EMPLOYER_AVG = new BigDecimal("0.0147");
}
