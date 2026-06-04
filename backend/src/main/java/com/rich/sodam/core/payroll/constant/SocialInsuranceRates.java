package com.rich.sodam.core.payroll.constant;

import java.math.BigDecimal;

/**
 * 4대보험 근로자 부담 요율 (2026 적용).
 *
 * <p>⚠️ 계산 주의:
 * <ul>
 *   <li>국민연금: 기준소득월액 상·하한 캡 적용 후 요율. (상·하한은 2026.07.01 갱신 예정 — 갱신 시 수정)</li>
 *   <li>장기요양보험: <b>건강보험료액</b>에 곱한다(보수월액 아님). 2단계 계산 필수.</li>
 *   <li>산재보험: 전액 사업주 부담 — 근로자 공제 없음(요율 0).</li>
 * </ul></p>
 *
 * <p>출처(2026.01.01 시행):
 * <ul>
 *   <li>국민연금 9.5%(근로자 4.75%) — 보건복지부, 2026.01.01 단계 인상 1년차</li>
 *   <li>건강보험 7.19%(근로자 3.595%), 장기요양 = 건강보험료 × (0.9448/7.19)</li>
 *   <li>고용보험(실업급여) 근로자 0.9%</li>
 *   <li>국민연금 기준소득월액 하한 40만/상한 637만 (2025.07~2026.06 적용분)</li>
 * </ul>
 * 4대보험 공단 모의계산(4insure.or.kr) 및 공시 교차확인.</p>
 */
public final class SocialInsuranceRates {

    private SocialInsuranceRates() {
    }

    /** 국민연금 근로자 부담률 (총 9.5%의 1/2). */
    public static final BigDecimal NATIONAL_PENSION_EMPLOYEE = new BigDecimal("0.0475");
    /** 국민연금 기준소득월액 하한(원). ~2026.06.30. */
    public static final BigDecimal PENSION_BASE_MIN = new BigDecimal("400000");
    /** 국민연금 기준소득월액 상한(원). ~2026.06.30 (2026.07 갱신 주의). */
    public static final BigDecimal PENSION_BASE_MAX = new BigDecimal("6370000");

    /** 건강보험 근로자 부담률 (총 7.19%의 1/2). */
    public static final BigDecimal HEALTH_EMPLOYEE = new BigDecimal("0.03595");
    /** 장기요양보험료 = 건강보험료액 × 이 비율 (0.9448/7.19). 보수월액 아님에 주의. */
    public static final BigDecimal LTC_ON_HEALTH_PREMIUM = new BigDecimal("0.13139");

    /** 고용보험(실업급여) 근로자 부담률. */
    public static final BigDecimal EMPLOYMENT_EMPLOYEE = new BigDecimal("0.009");

    /** 산재보험 근로자 부담률(없음 — 전액 사업주). */
    public static final BigDecimal INDUSTRIAL_ACCIDENT_EMPLOYEE = BigDecimal.ZERO;
}
