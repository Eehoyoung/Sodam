package com.rich.sodam.dto.response;

import java.math.BigDecimal;
import java.util.List;

/**
 * 노무 리스크 대시보드 응답 — 매장의 잠재 노무 리스크 항목 목록(사장 전용).
 */
public record LaborRiskResponse(List<Item> items) {

    /** 리스크 유형. */
    public enum RiskType {
        /** 이번 주 확정 시프트 합계가 주휴수당 발생 경계(13~17h) 구간. */
        WEEKLY_15H_BOUNDARY,
        /** 이번 주 실근무+확정 시프트 합계 48시간 이상 — 주 52시간 한도 임박. */
        WEEKLY_52H_NEAR,
        /** 근로계약서 없음/미서명(근로기준법 §17 서면 명시·교부 의무). */
        CONTRACT_UNSIGNED,
        /** 적용 시급이 현행(또는 차기년도 고시) 최저임금 미만. */
        MIN_WAGE_RISK,
        /** 입사 11개월 이상 경과 — 1년 근속(퇴직금 채권 발생) 임박. */
        SEVERANCE_UPCOMING,
        /** 월급제 계약의 스케줄 약정이 주 52시간 한도(연장 12h, §53) 초과. */
        CONTRACT_OVER_52H,
        /** 근로기준법 시행령 §7의2 상시근로자 참고 산정값이 5인 경계에 근접/도달(매장 단위 — employeeId 없음). */
        HEADCOUNT_THRESHOLD,
        /** 다음 주 확정 시프트 합계만으로 주 52시간 초과가 예상됨(사전 예측, 실근무 불요). */
        SCHEDULE_52H_FORECAST,
        /** 다음 주 확정 시프트 합계가 주휴수당 발생 기준(15h) 미만으로 예상됨(사전 예측). */
        SCHEDULE_15H_SHORTFALL,
        /** 다음 주 확정 시프트 중 4h→30분/8h→1h 휴게 배치 필요 구간이 있으나 스케줄에 휴게 기록이 없음. */
        BREAK_MISSING_FORECAST,
        /** 연소근로자(만 18세 미만)의 다음 주 확정 시프트가 22~06시 야간 시간대에 걸침(§70). */
        MINOR_NIGHT_FORECAST,
        /** 연소근로자의 다음 주 확정 시프트가 1일 7h 또는 1주 35h 한도 초과가 예상됨(§69). */
        MINOR_HOURS_FORECAST
    }

    /** 심각도 — DANGER: 즉시 위법 가능(최저임금 미만·계약서 미서명), WARN: 사전 경고. */
    public enum Severity {
        DANGER, WARN
    }

    /**
     * 리스크 항목. value 는 유형별 수치(시간 합계·시급·근속 개월 수 등).
     */
    public record Item(
            RiskType type,
            Severity severity,
            Long employeeId,
            String employeeName,
            String message,
            BigDecimal value
    ) {
    }
}
