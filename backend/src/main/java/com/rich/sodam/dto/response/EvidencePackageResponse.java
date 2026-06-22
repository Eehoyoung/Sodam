package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 근무 증거 패키지 (L-NEW-05) — 임금체불 진정 대비 셀프 증거 묶음.
 *
 * <p>한 직원의 근태·급여·계약·시급이력을 한 기간 기준으로 묶어 분쟁 시 참고 자료로 쓴다.
 * <b>집계만</b> — 신규 데이터를 만들지 않고 기존 기록을 한 화면에 모은다. 사장 전용.
 *
 * <p>PII 안전선: 이름·내부ID까지만 노출한다. 주민번호·계좌번호 등은 저장·노출하지 않는다.
 * 면책({@link #disclaimer})을 항상 동반한다(참고용·법적 제출 전 보완 필요).
 *
 * @param storeId      매장 id
 * @param employeeId   직원 내부 id
 * @param employeeName 직원 이름(주민번호 등 PII 제외)
 * @param from         집계 시작일
 * @param to           집계 종료일
 * @param attendance   근태 요약(출근일수·총근로시간)
 * @param payroll      급여 요약(기간 명세 합계)
 * @param contract     계약 요약(시급·근로조건·서명 여부)
 * @param wageHistory  시급 변경 이력(직원 override + 매장 default)
 * @param disclaimer   면책(참고용·법적 제출 전 보완 필요)
 */
public record EvidencePackageResponse(
        Long storeId,
        Long employeeId,
        String employeeName,
        LocalDate from,
        LocalDate to,
        AttendanceSummary attendance,
        PayrollSummary payroll,
        ContractSummary contract,
        List<WageHistoryLine> wageHistory,
        String disclaimer
) {
    /**
     * 근태 요약.
     *
     * @param workedDays         출근(체크인) 일수
     * @param recordCount        출퇴근 기록 건수
     * @param totalWorkedMinutes 총 근로시간(분) — 퇴근 처리된 기록만 합산
     * @param totalWorkedHours   총 근로시간(시간, 소수 1자리)
     */
    public record AttendanceSummary(
            int workedDays,
            int recordCount,
            long totalWorkedMinutes,
            double totalWorkedHours
    ) {
    }

    /**
     * 급여 요약 — 기간 내 발급 명세 합계.
     *
     * @param payslipCount   명세 건수
     * @param totalGrossWage 지급총액(세전) 합
     * @param totalNetWage   실수령액(세후) 합
     * @param totalDeduction 공제·세액 합
     */
    public record PayrollSummary(
            int payslipCount,
            long totalGrossWage,
            long totalNetWage,
            long totalDeduction
    ) {
    }

    /**
     * 계약 요약 — 가장 최근 근로계약서 기준(없으면 hasContract=false).
     *
     * @param hasContract           계약서 존재 여부
     * @param hourlyWage            계약 시급(원)
     * @param contractedHoursPerWeek 소정근로시간(주)
     * @param weeklyHolidayDay      주휴일 요일
     * @param startDate             계약 시작일
     * @param endDate               계약 종료일(정함 없으면 null)
     * @param signed                직원 서명(동의) 여부
     */
    public record ContractSummary(
            boolean hasContract,
            Integer hourlyWage,
            Double contractedHoursPerWeek,
            String weeklyHolidayDay,
            LocalDate startDate,
            LocalDate endDate,
            boolean signed
    ) {
    }

    /**
     * 시급 변경 이력 한 줄.
     *
     * @param scope         STORE_DEFAULT(매장 기본) / EMPLOYEE_OVERRIDE(직원 개별)
     * @param hourlyWage    적용 시급(원)
     * @param effectiveFrom 적용 시작일
     * @param reason        변경 사유(있으면)
     */
    public record WageHistoryLine(
            String scope,
            int hourlyWage,
            LocalDate effectiveFrom,
            String reason
    ) {
    }
}
