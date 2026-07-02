package com.rich.sodam.domain.type;

import lombok.Getter;

import java.util.Set;

/**
 * 구독 플랜 종류. 수익화·수익모델 확정안 v3.1 §1 기준.
 *
 * 선언 순서 = 티어 서열(FREE &lt; STARTER &lt; PRO &lt; PREMIUM). {@link #isAtLeast(PlanType)} 가
 * 이 순서({@link #ordinal()})에 의존하므로 중간 삽입·재정렬 금지(가격·기능만 확장).
 *
 * - 직원 수 상한: {@code employeeLimit}(null = 무제한)
 * - 기능 게이트: {@code features}({@link PlanFeature})
 */
@Getter
public enum PlanType {

    FREE("무료", 0, 2,
            "출퇴근 무제한 + 급여 미리보기(PDF 발급 잠금) + 근로계약서 양식",
            Set.of()),

    STARTER("스타터", 9_900, 5,
            "급여 자동 + 명세서 PDF 발급 + 퇴직금 + 노동법 경고(기본) + 4대보험 맛보기",
            Set.of(PlanFeature.PAYSLIP_PDF, PlanFeature.SEVERANCE,
                    PlanFeature.LABOR_LAW_BASIC, PlanFeature.LABOR_COST_RATIO,
                    PlanFeature.INSURANCE_PREVIEW)),

    PRO("프로", 19_900, null,
            "무제한 직원 + 풀 노동법 + 연차 + 4대보험 신고서 자동작성 + 전자계약 + 대시보드 + 멀티매장",
            Set.of(PlanFeature.PAYSLIP_PDF, PlanFeature.SEVERANCE,
                    PlanFeature.LABOR_LAW_BASIC, PlanFeature.LABOR_COST_RATIO,
                    PlanFeature.INSURANCE_PREVIEW, PlanFeature.LABOR_LAW_FULL,
                    PlanFeature.ANNUAL_LEAVE, PlanFeature.INSURANCE_FILING,
                    PlanFeature.E_CONTRACT, PlanFeature.DASHBOARD,
                    PlanFeature.MULTI_STORE)),

    PREMIUM("프리미엄", 39_900, null,
            "프로 전부 + 멀티매장 무제한 + 전담 CS + 세무·노무 우선연결 + 근로감독 증거패키지",
            Set.of(PlanFeature.PAYSLIP_PDF, PlanFeature.SEVERANCE,
                    PlanFeature.LABOR_LAW_BASIC, PlanFeature.LABOR_COST_RATIO,
                    PlanFeature.INSURANCE_PREVIEW, PlanFeature.LABOR_LAW_FULL,
                    PlanFeature.ANNUAL_LEAVE, PlanFeature.INSURANCE_FILING,
                    PlanFeature.E_CONTRACT, PlanFeature.DASHBOARD,
                    PlanFeature.MULTI_STORE, PlanFeature.PRIORITY_CS,
                    PlanFeature.PARTNER_REFERRAL, PlanFeature.INSPECTION_EVIDENCE));

    private final String displayName;
    private final int monthlyPriceKrw;
    /** null = 직원 수 무제한 */
    private final Integer employeeLimit;
    private final String description;
    private final Set<PlanFeature> features;

    PlanType(String displayName, int monthlyPriceKrw, Integer employeeLimit,
             String description, Set<PlanFeature> features) {
        this.displayName = displayName;
        this.monthlyPriceKrw = monthlyPriceKrw;
        this.employeeLimit = employeeLimit;
        this.description = description;
        this.features = features;
    }

    public boolean isPaid() {
        return monthlyPriceKrw > 0;
    }

    public boolean isUnlimitedEmployees() {
        return employeeLimit == null;
    }

    /** 해당 직원 수를 이 플랜으로 수용 가능한지(상한 포함). */
    public boolean allowsEmployeeCount(int employeeCount) {
        return employeeLimit == null || employeeCount <= employeeLimit;
    }

    public boolean hasFeature(PlanFeature feature) {
        return features.contains(feature);
    }

    /** 이 플랜이 {@code other} 이상 티어인지(서열은 선언 순서). */
    public boolean isAtLeast(PlanType other) {
        return this.ordinal() >= other.ordinal();
    }
}
