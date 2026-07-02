package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 직원별 연차 집계(추정). 출근율 100% 가정 — 실제는 출근율·결근에 따라 달라진다.
 *
 * @param employeeId   직원 ID
 * @param employeeName 직원 이름
 * @param hireDate     입사일(매장 기준)
 * @param tenureDays   재직 일수
 * @param entitledDays 발생 연차일수(근로기준법 §60)
 * @param fiveOrMore   5인 이상 사업장 여부(연차 적용 대상)
 */
public record EmployeeAnnualLeaveDto(
        Long employeeId,
        String employeeName,
        LocalDate hireDate,
        long tenureDays,
        int entitledDays,
        boolean fiveOrMore
) {
}
