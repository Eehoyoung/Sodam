package com.rich.sodam.core.payroll.constant;

/**
 * 연소근로자(만 18세 미만) 근로기준 상수 (L-NEW-01).
 *
 * <p>청소년 알바 고용 시 야간·과한 근로는 형사처벌 영역이므로 사장 보호용 안내 기준.
 * 노동법 개정 대비해 검증 로직과 분리(프로젝트 운영 기준 테스트 정책).
 *
 * <ul>
 *   <li>§69 연소자(15~18세 미만): 1일 7시간·1주 35시간 한도(당사자 합의 시 1일 1h·1주 5h 연장 가능)</li>
 *   <li>§70 야간(22:00~06:00)·휴일근로 원칙 금지 — 고용노동부 인가 + 본인 동의 필요</li>
 *   <li>§66 친권자(또는 후견인) 동의서·가족관계증명서 사업장 비치 의무</li>
 * </ul>
 *
 * <p>출처: 근로기준법 §66·§69·§70 (국가법령정보센터).
 */
public final class MinorLaborStandards {

    private MinorLaborStandards() {
    }

    /** 연소근로자 기준 연령(만). 이 나이 미만이면 연소자 보호 규정 적용. */
    public static final int MINOR_AGE_THRESHOLD = 18;

    /** 연소자 1일 근로시간 한도(§69, 시간). */
    public static final int DAILY_HOUR_LIMIT = 7;

    /** 연소자 1주 근로시간 한도(§69, 시간). */
    public static final int WEEKLY_HOUR_LIMIT = 35;

    /** 야간근로 제한 시작 시각(시, 24h). 22:00~익일 06:00 원칙 금지(§70). */
    public static final int NIGHT_START_HOUR = 22;

    /** 야간근로 제한 종료 시각(시, 24h, 익일). */
    public static final int NIGHT_END_HOUR = 6;
}
