package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 직원별 퇴직금 추정. 평균임금은 최근 급여(없으면 시급×8h)로 추정 — 실제는 평균임금 확정에 따라 달라진다.
 *
 * @param employeeId        직원 ID
 * @param employeeName      직원 이름
 * @param hireDate          입사일(매장 기준)
 * @param tenureDays        재직 일수
 * @param eligible          지급 대상 여부(계속근로 1년 이상; 주15h 요건은 별도)
 * @param averageDailyWage  추정 1일 평균임금(원)
 * @param estimatedSeverance 추정 퇴직금(원)
 */
public record EmployeeSeveranceDto(
        Long employeeId,
        String employeeName,
        LocalDate hireDate,
        long tenureDays,
        boolean eligible,
        long averageDailyWage,
        long estimatedSeverance
) {
}
