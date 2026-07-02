package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 플랜으로 게이팅되는 기능 단위. 수익화 확정안 §1(티어) 기준.
 *
 * 게이팅은 {@code @RequirePlan(features = ...)} 으로 선언적으로 강제한다.
 * 직원 수 상한은 기능이 아니라 {@link PlanType#getEmployeeLimit()} 로 별도 관리.
 */
@Getter
public enum PlanFeature {

    PAYSLIP_PDF("급여 명세서 PDF 발급"),
    SEVERANCE("퇴직금 계산"),
    ANNUAL_LEAVE("연차 관리"),
    LABOR_LAW_BASIC("노동법 경고(기본)"),
    LABOR_LAW_FULL("풀 노동법 경고"),
    LABOR_COST_RATIO("인건비 비율"),
    INSURANCE_PREVIEW("4대보험 조회·알림(맛보기)"),
    INSURANCE_FILING("4대보험 신고서 자동작성(사장 직접 제출)"),
    E_CONTRACT("전자 근로계약서·문서 보관"),
    DASHBOARD("맞춤 대시보드"),
    MULTI_STORE("멀티매장"),
    PRIORITY_CS("전담 CS"),
    PARTNER_REFERRAL("세무·노무 우선 연결"),
    INSPECTION_EVIDENCE("근로감독 증거 패키지");

    private final String label;

    PlanFeature(String label) {
        this.label = label;
    }
}
