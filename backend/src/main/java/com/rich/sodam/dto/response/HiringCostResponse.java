package com.rich.sodam.dto.response;

/**
 * 채용 총비용 시뮬레이터 응답 — 시급·주간 근무시간 기준 월 예상 인건비(사업주 관점).
 *
 * <p>모든 금액은 원 단위 월환산(주→월 4.345배 관례). 4대보험은 <b>사업주 부담분</b>이며
 * 산재보험은 업종 평균 요율 근사치 — 실제 고지액과 다를 수 있다.
 */
public record HiringCostResponse(
        long monthlyBaseWage,
        long weeklyAllowance,
        long monthlyGrossWage,
        boolean weeklyAllowanceEligible,
        EmployerInsurance employerInsurance,
        long monthlySeveranceAccrual,
        long monthlyTotalCost
) {

    /** 4대보험 사업주 부담분(월). 건강보험엔 장기요양 사업주분 포함. */
    public record EmployerInsurance(
            long nationalPension,
            long healthInsurance,
            long employmentInsurance,
            long industrialAccident,
            long total
    ) {
    }
}
