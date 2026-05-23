package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사장님 대시보드용 매장 통계 API (PRD_OWNER S-001).
 */
@RestController
@RequestMapping("/api/store-queries")
@RequiredArgsConstructor
@Tag(name = "매장 조회/통계")
public class StoreStatsController {

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;

    @Operation(summary = "오늘 출근 현황", description = "활성 직원 수 / 체크인 완료 / 미체크인 명단.")
    @GetMapping("/{storeId}/stats/today")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> today(@PathVariable Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("store not found"));

        List<EmployeeStoreRelation> active =
                employeeStoreRelationRepository.findByStoreAndIsActiveTrue(store);

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        List<Attendance> todayAttendances =
                attendanceRepository.findByStoreAndDate(store, startOfDay, endOfDay);

        int checkedIn = (int) todayAttendances.stream()
                .filter(a -> a.getCheckInTime() != null)
                .count();

        List<String> pending = active.stream()
                .filter(r -> todayAttendances.stream().noneMatch(
                        a -> a.getEmployeeProfile().getId().equals(r.getEmployeeProfile().getId())))
                .map(r -> r.getEmployeeProfile().getUser() != null
                        ? r.getEmployeeProfile().getUser().getName()
                        : "(이름 없음)")
                .toList();

        Map<String, Object> body = new HashMap<>();
        body.put("storeId", store.getId());
        body.put("storeName", store.getStoreName());
        body.put("checkedInCount", checkedIn);
        body.put("totalActiveEmployees", active.size());
        body.put("pendingEmployees", pending);
        return ResponseEntity.ok(body);
    }

    @Operation(summary = "이번 달 누적 급여", description = "이번 달 발급된 급여 명세서의 총합 + 근무시간 누계.")
    @GetMapping("/{storeId}/stats/payroll/month-to-date")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> monthToDate(@PathVariable Long storeId) {
        YearMonth ym = YearMonth.now();
        LocalDate start = ym.atDay(1);
        LocalDate end = LocalDate.now();

        List<Payroll> all = payrollRepository.findAll().stream()
                .filter(p -> p.getStore() != null && p.getStore().getId().equals(storeId))
                .filter(p -> p.getStartDate() != null && !p.getStartDate().isBefore(start)
                        && !p.getStartDate().isAfter(end))
                .toList();

        long totalGross = all.stream().mapToLong(p -> p.getGrossWage() == null ? 0 : p.getGrossWage()).sum();
        long totalNet = all.stream().mapToLong(p -> p.getNetWage() == null ? 0 : p.getNetWage()).sum();
        double totalHours = all.stream().mapToDouble(p -> {
            double r = p.getRegularHours() == null ? 0 : p.getRegularHours();
            double o = p.getOvertimeHours() == null ? 0 : p.getOvertimeHours();
            double n = p.getNightWorkHours() == null ? 0 : p.getNightWorkHours();
            return r + o + n;
        }).sum();

        int daysLeft = ym.lengthOfMonth() - end.getDayOfMonth();

        Map<String, Object> body = new HashMap<>();
        body.put("storeId", storeId);
        body.put("totalGross", totalGross);
        body.put("totalNet", totalNet);
        body.put("totalWorkingHours", totalHours);
        body.put("daysRemainingInMonth", daysLeft);
        return ResponseEntity.ok(body);
    }
}
