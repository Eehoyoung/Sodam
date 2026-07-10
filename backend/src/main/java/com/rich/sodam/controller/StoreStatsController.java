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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.StoreAccessGuard;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사장님 대시보드용 매장 통계 API (PRD_OWNER S-001).
 */
@MasterOnly
@RestController
@RequestMapping("/api/store-queries")
@RequiredArgsConstructor
@Tag(name = "매장 조회/통계")
public class StoreStatsController {

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;
    private final StoreAccessGuard guard;

    @Operation(summary = "오늘 출근 현황", description = "활성 직원 수 / 체크인 완료 / 미체크인 명단.")
    @GetMapping("/{storeId}/stats/today")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> today(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("store not found"));
        return ResponseEntity.ok(buildTodayStats(store));
    }

    @Operation(summary = "이번 달 누적 급여", description = "이번 달 발급된 급여 명세서의 총합 + 근무시간 누계.")
    @GetMapping("/{storeId}/stats/payroll/month-to-date")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> monthToDate(@AuthenticationPrincipal UserPrincipal principal,
                                                           @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(buildMonthToDateStats(storeId));
    }

    /**
     * OwnerDashboardScreen 합성 엔드포인트(DB_OPTIMIZATION_PLAN.md §Phase 9).
     *
     * <p>FE 가 {@code today}·{@code payroll/month-to-date}를 순차(waterfall)로 호출하던 구간을 왕복 1회로
     * 줄인다 — 두 통계는 서로 데이터 의존이 없고 같은 {@code storeId}만 필요하므로 합칠 수 있었다. 기존
     * 두 엔드포인트는 다른 화면·버전 호환을 위해 그대로 유지하고, 이 엔드포인트는 같은 조회 로직을
     * 재사용해 한 응답으로 묶기만 한다({@code storeId} 필드가 양쪽에 겹쳐 평탄화 대신 중첩 구조로 응답해
     * 네이밍 충돌을 피한다).</p>
     */
    @Operation(summary = "대시보드 합성 통계", description = "오늘 출근 현황 + 이번 달 누적 급여를 한 응답으로 반환(today/payroll/month-to-date 합성).")
    @GetMapping("/{storeId}/stats/dashboard")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> dashboard(@AuthenticationPrincipal UserPrincipal principal,
                                                           @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("store not found"));

        Map<String, Object> body = new HashMap<>();
        body.put("today", buildTodayStats(store));
        body.put("payroll", buildMonthToDateStats(storeId));
        return ResponseEntity.ok(body);
    }

    private Map<String, Object> buildTodayStats(Store store) {
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
        return body;
    }

    private Map<String, Object> buildMonthToDateStats(Long storeId) {
        YearMonth ym = YearMonth.now();
        LocalDate start = ym.atDay(1);
        LocalDate end = LocalDate.now();

        // 전테넌트 findAll() 대신 매장 스코프 쿼리로 조회(성능·격리). 기간 필터는 동일 의미 유지.
        List<Payroll> all = payrollRepository.findByStore_IdOrderByEndDateDesc(storeId).stream()
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
        return body;
    }
}
