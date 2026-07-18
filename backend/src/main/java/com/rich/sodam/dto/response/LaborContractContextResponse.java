package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 근로계약서 작성 화면에 채워줄 보조 정보.
 *
 * <p>계약서 행에 값을 복제 저장하지 않고, 작성 시점의 매장·직원·법정 기준값을 조회해 반환한다.
 *
 * @param nationalPensionMinMonthlyIncome 국민연금 기준소득월액 하한(원, 오늘 날짜 기준) —
 *                                        매년 7.1 갱신되므로 FE 는 이 값을 그대로 미리보기에 써야
 *                                        한다(하드코딩하면 갱신일 경계에서 서버 저장값과 어긋난다).
 */
public record LaborContractContextResponse(
        String employerName,
        String employerBusinessNumber,
        String employerPhone,
        String employerAddress,
        String employeeName,
        String employeePhone,
        LocalDate employeeBirthDate,
        boolean minorWorker,
        int minimumWageYear,
        int minimumWageHourly,
        double nightWorkRate,
        double overtimeRate,
        double weeklyAllowanceThreshold,
        boolean fiveOrMoreEmployees,
        Integer employeeCount,
        String suggestedWageComponents,
        int nationalPensionMinMonthlyIncome
) {
}
