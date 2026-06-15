package com.rich.sodam.dto.response;

/**
 * 매장 인건비 집계. 인건비비율은 매출(monthlyRevenue) 제공 시에만 산출(없으면 null).
 *
 * @param storeId          매장 ID
 * @param month            집계 월(yyyy-MM)
 * @param employeeCount    활성 직원 수
 * @param totalLaborCost   해당 월 확정 급여 총액(원, grossWage 합)
 * @param averageHourlyWage 활성 직원 평균 시급(원)
 * @param laborCostRatio   인건비 비율(0~1). 매출 미제공 시 null
 */
public record StoreLaborSummaryDto(
        Long storeId,
        String month,
        int employeeCount,
        long totalLaborCost,
        int averageHourlyWage,
        Double laborCostRatio
) {
}
