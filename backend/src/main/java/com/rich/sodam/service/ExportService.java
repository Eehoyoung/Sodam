package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 출퇴근/급여 CSV 내보내기 (PRD_OWNER A35·A45 · A-부가) 애플리케이션 서비스.
 *
 * <p>매장 소유 검증(BOLA 가드)은 컨트롤러 책임이며, 여기서는 CSV 본문 조립만 담당한다.
 * WP-09 2단계: 컨트롤러에서 repository 직접 접근을 이관(behavior-preserving).
 */
@Service
@RequiredArgsConstructor
public class ExportService {

    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public String buildAttendanceCsv(Long storeId, LocalDate from, LocalDate to) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요."));
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(23, 59, 59);
        List<Attendance> list =
                attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        store, start, end);

        StringBuilder sb = new StringBuilder();
        sb.append("﻿"); // UTF-8 BOM
        sb.append("직원 ID,직원명,날짜,출근,퇴근,근무시간(분),적용시급,일급\n");
        for (Attendance a : list) {
            String empName = a.getEmployeeProfile() != null && a.getEmployeeProfile().getUser() != null
                    ? csvSafe(a.getEmployeeProfile().getUser().getName()) : "";
            Long empId = a.getEmployeeProfile() != null ? a.getEmployeeProfile().getId() : null;
            sb.append(empId == null ? "" : empId).append(',')
                    .append(empName).append(',')
                    .append(a.getCheckInTime() != null ? a.getCheckInTime().toLocalDate() : "").append(',')
                    .append(a.getCheckInTime() != null ? a.getCheckInTime().toLocalTime() : "").append(',')
                    .append(a.getCheckOutTime() != null ? a.getCheckOutTime().toLocalTime() : "").append(',')
                    .append(a.getWorkingTimeInMinutes()).append(',')
                    .append(a.getAppliedHourlyWage() != null ? a.getAppliedHourlyWage() : "").append(',')
                    .append(a.calculateDailyWage()).append('\n');
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String buildPayrollCsv(Long storeId, LocalDate from, LocalDate to) {
        List<Payroll> list = payrollRepository.findAll().stream()
                .filter(p -> p.getStore() != null && storeId.equals(p.getStore().getId()))
                .filter(p -> p.getStartDate() != null
                        && !p.getStartDate().isBefore(from)
                        && !p.getStartDate().isAfter(to))
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append("﻿");
        sb.append("급여 ID,직원,기간,기본,연장,야간,주휴,세전,세금,실수령,상태\n");
        for (Payroll p : list) {
            String emp = p.getEmployee() != null && p.getEmployee().getUser() != null
                    ? csvSafe(p.getEmployee().getUser().getName()) : "";
            sb.append(p.getId()).append(',')
                    .append(emp).append(',')
                    .append(p.getStartDate()).append('~').append(p.getEndDate()).append(',')
                    .append(p.getRegularWage() == null ? 0 : p.getRegularWage()).append(',')
                    .append(p.getOvertimeWage() == null ? 0 : p.getOvertimeWage()).append(',')
                    .append(p.getNightWorkWage() == null ? 0 : p.getNightWorkWage()).append(',')
                    .append(p.getWeeklyAllowance() == null ? 0 : p.getWeeklyAllowance()).append(',')
                    .append(p.getGrossWage() == null ? 0 : p.getGrossWage()).append(',')
                    .append(p.getTaxAmount() == null ? 0 : p.getTaxAmount()).append(',')
                    .append(p.getNetWage() == null ? 0 : p.getNetWage()).append(',')
                    .append(p.getStatus() == null ? "" : p.getStatus().name()).append('\n');
        }
        return sb.toString();
    }

    /** CSV 안전 문자열: 쉼표/따옴표/개행 포함 시 따옴표 감싸기 + 내부 따옴표 이중. */
    private static String csvSafe(String s) {
        if (s == null) return "";
        boolean needQuote = s.contains(",") || s.contains("\"") || s.contains("\n");
        String escaped = s.replace("\"", "\"\"");
        return needQuote ? "\"" + escaped + "\"" : escaped;
    }
}
