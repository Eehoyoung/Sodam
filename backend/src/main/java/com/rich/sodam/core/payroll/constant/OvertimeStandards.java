package com.rich.sodam.core.payroll.constant;

/**
 * 연장근로 한도 기준 상수 (근로기준법 §53·§50).
 *
 * <p>1주 근로시간 한도:
 * <ul>
 *   <li>소정근로 40h (§50①) + 연장근로 12h (§53①) = <b>최대 52h</b></li>
 * </ul>
 * 이 한도를 초과한 주는 §53 위반(연장근로 한도 초과)으로, 위반 시 형사처벌 대상(§110).
 * 소담은 연장수당 금액은 계산하지만 이 한도 위반은 별도로 사장에게 경보한다(L-NEW-02).
 *
 * <p>출처: 근로기준법 §50·§53·§110 (국가법령정보센터).
 * 노동법 개정 대비해 계산 로직과 분리(프로젝트 운영 기준 테스트 정책).
 */
public final class OvertimeStandards {

    private OvertimeStandards() {
    }

    /** 1주 법정 소정근로시간(§50①). */
    public static final double STATUTORY_WEEKLY_HOURS = 40.0;

    /** 1주 연장근로 한도(§53①). */
    public static final double MAX_WEEKLY_OVERTIME_HOURS = 12.0;

    /**
     * 1주 실근로시간 최대치(소정 40h + 연장 12h = 52h, §50·§53).
     * 이 값을 초과한 주는 연장근로 한도 위반.
     */
    public static final double MAX_WEEKLY_HOURS = STATUTORY_WEEKLY_HOURS + MAX_WEEKLY_OVERTIME_HOURS;
}
