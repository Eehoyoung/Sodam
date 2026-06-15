package com.rich.sodam.core.payroll.constant;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * 근로기준법 가산수당·근로시간 기준 상수 (§50·§54·§56).
 *
 * <p>가산수당은 "가산분"만 정의한다(기본 100% 별도). 근로기준법 §56:
 * <ul>
 *   <li>연장근로(1일 8h/주 40h 초과): +50% (§56①)</li>
 *   <li>야간근로(22:00~익일 06:00): +50% (§56③)</li>
 *   <li>휴일근로 8h 이내: +50%, 8h 초과분: +100% (§56②)</li>
 * </ul>
 * 중복 시 각 가산을 합산(연장+야간 = 기본100 + 연장50 + 야간50 = 200%).</p>
 *
 * <p>출처: 근로기준법 §56 (국가법령정보센터), 고용노동부 행정해석.
 * 노동법 개정 대비해 계산 로직과 분리(CLAUDE.md 테스트 정책).</p>
 */
public final class LaborStandards {

    private LaborStandards() {
    }

    /** 1일 법정 소정근로시간(시간). 초과분이 연장근로. */
    public static final double STATUTORY_DAILY_HOURS = 8.0;

    /**
     * 휴게시간 의무(§54). 근로시간이 길이에 따라 근로시간 도중 부여해야 하며, 무급이므로 임금산정에서 공제.
     * <ul>
     *   <li>4시간 이상 → 최소 30분</li>
     *   <li>8시간 이상 → 최소 1시간</li>
     * </ul>
     * 5인 미만 사업장에도 적용. 출처: 근로기준법 §54.
     */
    public static final double BREAK_THRESHOLD_4H = 4.0;
    public static final double BREAK_THRESHOLD_8H = 8.0;
    public static final double BREAK_MINUTES_OVER_4H = 30.0 / 60.0; // 0.5h
    public static final double BREAK_MINUTES_OVER_8H = 60.0 / 60.0; // 1.0h

    /** 야간근로 시작(22:00). */
    public static final LocalTime NIGHT_START = LocalTime.of(22, 0);
    /** 야간근로 종료(익일 06:00). */
    public static final LocalTime NIGHT_END = LocalTime.of(6, 0);

    /** 연장근로 가산율(가산분, §56①). */
    public static final BigDecimal OVERTIME_PREMIUM = new BigDecimal("0.5");
    /** 야간근로 가산율(가산분, §56③). */
    public static final BigDecimal NIGHT_PREMIUM = new BigDecimal("0.5");
    /** 휴일근로 8h 이내 가산율(§56②). */
    public static final BigDecimal HOLIDAY_PREMIUM_WITHIN_8H = new BigDecimal("0.5");
    /** 휴일근로 8h 초과분 가산율(§56②). */
    public static final BigDecimal HOLIDAY_PREMIUM_OVER_8H = new BigDecimal("1.0");

    /**
     * 5인 미만 사업장 기준(상시근로자 수). 미만이면 §56 가산수당·§60 연차 미적용.
     * (주휴수당 §55·최저임금·퇴직금·휴게 §54 는 5인 미만에도 적용)
     * 출처: 근로기준법 §11, 시행령 §7의2.
     */
    public static final int SMALL_BUSINESS_THRESHOLD = 5;

    /**
     * 연차유급휴가(§60).
     * <ul>
     *   <li>1년 미만 or 1년간 80% 미만 출근: 1개월 개근 시 1일(§60②) — 최대 {@link #ANNUAL_LEAVE_FIRST_YEAR_MAX}</li>
     *   <li>1년간 80% 이상 출근: 15일(§60①)</li>
     *   <li>3년 이상 계속근로: 최초 1년 초과 매 2년에 1일 가산(§60④) — 최대 {@link #ANNUAL_LEAVE_MAX}</li>
     * </ul>
     */
    public static final int ANNUAL_LEAVE_BASE = 15;
    public static final int ANNUAL_LEAVE_FIRST_YEAR_MAX = 11;
    public static final int ANNUAL_LEAVE_MAX = 25;
    public static final double ANNUAL_LEAVE_ATTENDANCE_THRESHOLD = 0.8;
}
