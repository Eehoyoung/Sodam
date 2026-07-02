package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 연장근로 한도(주 52h, §53) 실시간 경보 (B5/L-NEW-02).
 *
 * <p>출근 기록으로 직원별·주별 실근로시간을 합산해 1주 52h(소정40+연장12)를 초과한 주를 추출한다.
 * 소담은 연장수당 금액은 계산하면서 한도 위반은 막아주지 못했다 — 위반 시 형사처벌(§110)인데도
 * 사장이 모른 채 명세서를 낸다. 본 응답은 그 위반 주를 사장에게 경보한다. <b>추정·참고용</b>.
 *
 * @param storeId      매장 ID
 * @param from         조회 시작일(포함)
 * @param to           조회 종료일(포함)
 * @param violations   52h 초과 주 목록(직원·주별)
 * @param hasViolation 위반 주 존재 여부(경보 표시 트리거)
 * @param disclaimer   면책
 */
public record OvertimeCheckResponse(
        Long storeId,
        LocalDate from,
        LocalDate to,
        List<Violation> violations,
        boolean hasViolation,
        String disclaimer
) {
    /**
     * 한 직원의 한 주(週) 연장근로 한도 초과.
     *
     * @param employeeId  직원 ID
     * @param employeeName 직원 이름
     * @param weekStart   해당 주 시작일(월요일)
     * @param weeklyHours 그 주 실근로시간 합계
     * @param overBy      52h 초과분(weeklyHours - 52)
     */
    public record Violation(
            Long employeeId,
            String employeeName,
            LocalDate weekStart,
            double weeklyHours,
            double overBy
    ) {
    }
}
