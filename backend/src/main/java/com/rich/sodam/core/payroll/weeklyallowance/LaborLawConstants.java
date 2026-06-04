package com.rich.sodam.core.payroll.weeklyallowance;

import java.math.BigDecimal;

/**
 * 한국 근로기준법 기반 주휴수당 산정 상수.
 *
 * <p>노동법 개정에 대비해 계산 로직과 분리한다(CLAUDE.md 테스트 정책: "한국 노동법 변경에 대비해 상수는 별도 파일에 분리").
 * 값 변경 시 이 파일만 수정하면 전 전략(strategy)에 반영된다.</p>
 *
 * <p>근거:
 * <ul>
 *   <li>근로기준법 §55(주휴일), §18③(단시간 근로자의 주휴 비례 적용)</li>
 *   <li>주휴수당 발생 요건: 1주 소정근로시간 15시간 이상 + 소정근로일 개근</li>
 *   <li>주휴시간 = (1주 소정근로시간 / 40) × 8, 상한 8시간</li>
 * </ul>
 * </p>
 */
public final class LaborLawConstants {

    private LaborLawConstants() {
    }

    /** 법정 기준 1주 소정근로시간 (시간). */
    public static final BigDecimal STATUTORY_WEEKLY_HOURS = new BigDecimal("40");

    /** 법정 기준 1일 소정근로시간 (시간) = 주휴 1일분 환산 기준. */
    public static final BigDecimal STATUTORY_DAILY_HOURS = new BigDecimal("8");

    /** 주휴수당 발생 최소 1주 소정근로시간 (시간). 미만이면 미발생. */
    public static final BigDecimal MIN_WEEKLY_HOURS_FOR_ALLOWANCE = new BigDecimal("15");

    /** 주휴수당 환산 시간 상한 (시간). 주 40시간 초과 근무여도 8시간을 넘기지 않는다. */
    public static final BigDecimal MAX_WEEKLY_ALLOWANCE_HOURS = STATUTORY_DAILY_HOURS;
}
