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
        SEVERANCE_UPCOMING
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
