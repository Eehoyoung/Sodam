package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 근로자명부 자료 (B8/L-NEW-03) — 근로기준법 §41 근로자명부.
 *
 * <p>매장 직원별 이름·입사일·시급·재직상태를 산출한다.
 * 근로감독·체불진정 1순위 요구 서류. <b>참고용</b> — 법정 서식은 사장이 보완해야 한다.
 * 주민번호·주소·종사업무 등 §41 일부 항목은 미저장(이름+내부ID까지만 — Hard No 준수).
 *
 * @param storeId       매장 id
 * @param employeeCount 명부 인원
 * @param items         직원별 명부 라인
 * @param disclaimer    면책(참고용·법정 서식 보완 필요)
 */
public record EmployeeRosterResponse(
        Long storeId,
        int employeeCount,
        List<RosterLine> items,
        String disclaimer
) {
    /**
     * 직원별 명부 항목.
     *
     * @param employeeId   내부 직원 id
     * @param employeeName 직원 이름
     * @param hireDate     입사일(매장별)
     * @param hourlyWage   적용 시급(개별 또는 매장 기준)
     * @param active       재직 여부(true 재직 / false 퇴사·비활성)
     */
    public record RosterLine(
            Long employeeId,
            String employeeName,
            LocalDate hireDate,
            Integer hourlyWage,
            boolean active
    ) {
    }
}
