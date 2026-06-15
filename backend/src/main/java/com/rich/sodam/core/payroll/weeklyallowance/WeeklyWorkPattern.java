package com.rich.sodam.core.payroll.weeklyallowance;

/**
 * 주휴수당 산정 시 근무 형태 구분.
 *
 * <p>소상공인 현장은 근무 형태가 다양하므로(평일 고정 풀타임, 단시간, 교대 스케줄) 형태별로
 * 소정근로시간 산정 방식이 달라진다. 형태를 명시할 수 없으면 {@link #AUTO} 로 두고
 * resolver 가 실근로시간으로 형태를 추론한다.</p>
 */
public enum WeeklyWorkPattern {

    /** 평일 고정 풀타임(예: 주 5일 × 1일 8시간). 1주 소정근로 40시간 이상. */
    WEEKDAY_FIXED,

    /** 단시간 근로자(주 15시간 이상 40시간 미만). 주휴시간 비례 산정(근로기준법 §18③). */
    SHORT_TIME,

    /** 교대/스케줄 근무. 주마다 시간이 불규칙 → 4주 평균 등으로 1주 소정근로시간을 환산. */
    SHIFT_SCHEDULE,

    /** 형태 미지정. resolver 가 실근로시간 기준으로 형태를 추론. */
    AUTO
}
