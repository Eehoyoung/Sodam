package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 근로계약서 작성 화면에 채워줄 보조 정보.
 *
 * <p>계약서 행에 값을 복제 저장하지 않고, 작성 시점의 매장·직원·법정 기준값을 조회해 반환한다.
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
        String suggestedWageComponents
) {
}
