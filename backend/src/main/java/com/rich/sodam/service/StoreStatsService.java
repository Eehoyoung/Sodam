package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사장님 대시보드용 매장 통계 애플리케이션 서비스 (PRD_OWNER S-001).
 *
 * <p>매장 소유/전결 권한 검증(BOLA 가드)은 컨트롤러 책임이며, 여기서는 통계 조회·조립만
 * 담당한다. WP-09 2단계: 컨트롤러에서 repository 직접 접근을 이관(behavior-preserving).
 */
@Service
@RequiredArgsConstructor
public class StoreStatsService {

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final AttendanceRepository attendanceRepository;
    private final PayrollRepository payrollRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> today(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("store not found"));
        return buildTodayStats(store);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> monthToDate(Long storeId) {
        return buildMonthToDateStats(storeId);
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
    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("store not found"));

        Map<String, Object> body = new HashMap<>();
        body.put("today", buildTodayStats(store));
        body.put("payroll", buildMonthToDateStats(storeId));
        return body;
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
