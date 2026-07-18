package com.rich.sodam.domain.type;

/**
 * 휴가 신청 단위.
 *
 * <p>{@link #FULL_DAY}(종일)만 근로기준법이 직접 규율하는 단위다. {@link #HALF_DAY}(반차)는
 * 노사 합의에 따른 실무 관행이고, {@link #HOURS}(시간 단위)는 매장 자체 정책(노사 합의)이다 —
 * 법정 시간 단위 연차(개정 근로기준법)는 2027-06-10 시행 예정으로 2026-07 현재 시행령이
 * 확정되지 않았다. 내부적으로는 신청 시간을 계약상 소정근로시간 기준으로 일수 환산해 동일한
 * 연차 잔여 풀에서 차감한다({@code TimeOffConsumptionCalculator}).</p>
 */
public enum TimeOffUnit {
    /** 종일. */
    FULL_DAY,
    /** 반차(0.5일, 매장 자체 정책). */
    HALF_DAY,
    /** 시간 단위(매장 자체 정책 — 법정 제도 아님). */
    HOURS
}
