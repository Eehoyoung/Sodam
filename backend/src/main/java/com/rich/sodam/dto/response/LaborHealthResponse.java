package com.rich.sodam.dto.response;

import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;

import java.util.List;

/**
 * 노무 건강도 대시보드 요약 (WP-7, 사장 전용). {@link com.rich.sodam.service.LaborRiskService}의
 * 판정을 재사용해 0~100 참고 점수 + 건수 중심으로 요약한다(신규 테이블 없음).
 *
 * <p>UI는 점수·등급이 아니라 "확인이 필요한 항목 N건" 건수 중심으로 노출한다 — score는 참고
 * 보조 지표일 뿐 화면 전면에 "안전 등급"처럼 내세우지 않는다(HC-1).
 *
 * <p>플랜 게이팅(PlanFeature): LABOR_LAW_BASIC이면 건수·유형만({@code items[].message}가 null),
 * LABOR_LAW_FULL이면 설명·해소 가이드까지({@code message} 채워짐).
 *
 * @param score               0~100 참고 점수(DANGER/WARN 가중 감점). 법적 안전 판정이 아니다.
 * @param dangerCount         DANGER 건수
 * @param warnCount           WARN 건수
 * @param needsAttentionCount 확인이 필요한 총 건수(danger+warn) — 화면 전면 노출용
 * @param items               리스크 항목 목록(플랜에 따라 message 유무 다름)
 * @param disclaimer          면책 문구 — 화면 상시 노출
 */
public record LaborHealthResponse(
        Long storeId,
        int score,
        int dangerCount,
        int warnCount,
        int needsAttentionCount,
        List<SummaryItem> items,
        String disclaimer
) {
    /** message는 LABOR_LAW_FULL 플랜에서만 채워진다(BASIC은 null). */
    public record SummaryItem(
            RiskType type,
            Severity severity,
            Long employeeId,
            String employeeName,
            String message
    ) {
    }
}
