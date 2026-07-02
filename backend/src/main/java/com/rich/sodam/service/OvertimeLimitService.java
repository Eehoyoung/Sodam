package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.OvertimeStandards;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.OvertimeCheckResponse;
import com.rich.sodam.dto.response.OvertimeCheckResponse.Violation;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 연장근로 한도(주 52h, §53) 실시간 경보 (B5/L-NEW-02).
 *
 * <p>출근 기록(NFC+GPS)으로 직원별·주별 실근로시간을 합산해, 1주 {@link OvertimeStandards#MAX_WEEKLY_HOURS}
 * (소정40+연장12)를 초과한 주를 추출한다. 소담은 연장수당 금액은 계산하면서 한도 위반은 막아주지 못했다 —
 * 위반 시 형사처벌(§110)인데도 사장이 모른 채 명세서를 낸다. 본 서비스는 그 위반 주를 경보한다.
 *
 * <p><b>주 경계</b>: ISO 주(월요일 시작). 출근 시각(checkIn)이 속한 주에 그 근무의 전체 근로시간을 귀속한다.
 * 자정을 넘긴 야간근무도 출근일 기준 주에 합산(일관성 우선). 추정치이므로 면책 동반.
 */
@Service
@RequiredArgsConstructor
public class OvertimeLimitService {

    static final String DISCLAIMER =
            "참고용 추정이에요. 출근 기록 기준 주별 실근로시간 합계로, 연장근로 한도(주 52시간) 위반 여부는 "
                    + "근무 기록·휴게시간 산정에 따라 달라질 수 있어 노무사 검토가 필요해요.";

    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;

    /**
     * 한 달(year-month)의 연장근로 한도 위반 주를 점검한다.
     * 월 경계에 걸친 주를 빠짐없이 포함하도록 조회는 그 달이 속한 ISO 주의 월요일~일요일 범위로 확장한다.
     */
    @Transactional(readOnly = true)
    public OvertimeCheckResponse checkYearMonth(Long storeId, int year, int month) {
        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        return check(storeId, first, last);
    }

    /**
     * 기간 [from, to] 의 연장근로 한도 위반 주를 점검한다.
     * 위반 주는 직원·주 시작일(월) 순으로 정렬되어 반환된다.
     */
    @Transactional(readOnly = true)
    public OvertimeCheckResponse check(Long storeId, LocalDate from, LocalDate to) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));

        // 경계에 걸친 주를 통째로 포함하도록 조회 범위를 주 경계까지 확장.
        LocalDate scanStart = weekStart(from);
        LocalDateTime start = scanStart.atStartOfDay();
        LocalDateTime end = to.atTime(23, 59, 59);

        List<Attendance> rows =
                attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(store, start, end);

        // (직원, 주시작일) → 그 주 실근로시간 합계(시간)
        Map<Long, EmployeeKey> employees = new HashMap<>();
        Map<WeekKey, Double> weeklyHours = new LinkedHashMap<>();

        for (Attendance a : rows) {
            if (a.getCheckInTime() == null || a.getCheckOutTime() == null) {
                continue; // 퇴근 미기록은 근로시간 산정 불가 → 제외
            }
            EmployeeProfile profile = a.getEmployeeProfile();
            if (profile == null || profile.getId() == null) {
                continue;
            }
            double hours = hoursOf(a);
            if (hours <= 0) {
                continue;
            }
            Long empId = profile.getId();
            LocalDate ws = weekStart(a.getCheckInTime().toLocalDate());

            employees.putIfAbsent(empId, new EmployeeKey(empId, nameOf(profile)));
            weeklyHours.merge(new WeekKey(empId, ws), hours, Double::sum);
        }

        List<Violation> violations = new ArrayList<>();
        for (Map.Entry<WeekKey, Double> e : weeklyHours.entrySet()) {
            double total = e.getValue();
            if (total > OvertimeStandards.MAX_WEEKLY_HOURS) {
                EmployeeKey emp = employees.get(e.getKey().employeeId());
                double overBy = round1(total - OvertimeStandards.MAX_WEEKLY_HOURS);
                violations.add(new Violation(
                        emp.employeeId(), emp.employeeName(), e.getKey().weekStart(),
                        round1(total), overBy));
            }
        }
        violations.sort(Comparator
                .comparing(Violation::employeeId)
                .thenComparing(Violation::weekStart));

        return new OvertimeCheckResponse(
                storeId, from, to, violations, !violations.isEmpty(), DISCLAIMER);
    }

    private double hoursOf(Attendance a) {
        Duration d = Duration.between(a.getCheckInTime(), a.getCheckOutTime());
        return d.toMinutes() / 60.0;
    }

    private String nameOf(EmployeeProfile profile) {
        if (profile.getUser() != null && profile.getUser().getName() != null) {
            return profile.getUser().getName();
        }
        return "직원";
    }

    /** 해당 일자가 속한 ISO 주의 월요일. */
    private LocalDate weekStart(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private record EmployeeKey(Long employeeId, String employeeName) {
    }

    private record WeekKey(Long employeeId, LocalDate weekStart) {
    }
}
