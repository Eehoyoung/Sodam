package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.DailySales;
import com.rich.sodam.domain.PayrollCycle;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.CycleLaborRatioDto;
import com.rich.sodam.dto.response.DailyLaborRatioDto;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.DailySalesRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * 인건비율(인건비/매출) 조회 — 사장 대시보드용 파생 지표.
 *
 * <p>인건비는 출퇴근 기록({@code attendance}) 의 적용시급 × 근무시간으로 일자별 합산한다
 * (급여 확정 전에도 "오늘까지 쓴 인건비"를 보여주기 위해 급여(Payroll)가 아닌 출퇴근 기반 —
 * 월 집계 기반 {@link LaborAggregationService#storeLaborSummary} 와 상호 보완).
 * 매출은 {@link DailySales} 에서 읽으며, 매출 미입력/0원인 날의 ratio 는 null 이다.
 */
@Service
@RequiredArgsConstructor
public class LaborRatioService {

    private final StoreRepository storeRepository;
    private final AttendanceRepository attendanceRepository;
    private final DailySalesRepository dailySalesRepository;

    /**
     * 일자별 인건비율. [from, to] 구간의 모든 날짜를 반환한다(기록 없는 날은 laborCost=0, sales=null).
     */
    @Transactional(readOnly = true)
    public List<DailyLaborRatioDto> daily(Long storeId, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new IllegalArgumentException("조회 기간(from~to)이 올바르지 않습니다.");
        }
        Store store = store(storeId);

        Map<LocalDate, Long> laborByDate = laborCostByDate(store, from, to);
        Map<LocalDate, Long> salesByDate = dailySalesRepository
                .findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(storeId, from, to).stream()
                .collect(Collectors.toMap(DailySales::getSaleDate, DailySales::getAmount));

        List<DailyLaborRatioDto> result = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            long labor = laborByDate.getOrDefault(d, 0L);
            Long sales = salesByDate.get(d);
            result.add(new DailyLaborRatioDto(d, labor, sales, ratio(labor, sales)));
        }
        return result;
    }

    /**
     * 현재 진행 중인 급여 정산주기 기준 인건비율 + 직전 주기 비율 비교.
     *
     * @throws IllegalArgumentException 매장에 정산주기가 설정되어 있지 않은 경우 (→ 400)
     */
    @Transactional(readOnly = true)
    public CycleLaborRatioDto cycle(Long storeId) {
        Store store = store(storeId);
        PayrollCycle cycle = store.getPayrollCycle();
        if (cycle == null || !cycle.isConfigured()) {
            throw new IllegalArgumentException("매장의 급여 정산주기가 설정되어 있지 않습니다.");
        }

        LocalDate today = LocalDate.now();
        YearMonth current = resolveCurrentCycleMonth(cycle, today);
        LocalDate start = cycle.resolveStart(current);
        LocalDate end = cycle.resolveEnd(current);

        // 현재 주기: 오늘까지 누적 (미래 날짜 인건비/매출은 존재하지 않지만 조회 범위를 좁힌다)
        LocalDate effectiveEnd = end.isBefore(today) ? end : today;
        long laborCost = sumLaborCost(store, start, effectiveEnd);
        Long sales = sumSales(storeId, start, effectiveEnd);

        // 직전 주기 (전체 기간)
        Double prevRatio = null;
        YearMonth prev = current.minusMonths(1);
        LocalDate prevStart = cycle.resolveStart(prev);
        LocalDate prevEnd = cycle.resolveEnd(prev);
        if (prevStart != null && prevEnd != null && !prevStart.isAfter(prevEnd)) {
            long prevLabor = sumLaborCost(store, prevStart, prevEnd);
            prevRatio = ratio(prevLabor, sumSales(storeId, prevStart, prevEnd));
        }

        return new CycleLaborRatioDto(start, end, laborCost, sales, ratio(laborCost, sales), prevRatio);
    }

    /**
     * 오늘이 포함되는 정산주기의 기준월을 찾는다.
     * 후보(전월/당월/익월 기준)를 순회하며 start ≤ today ≤ end 인 첫 기준월을 반환.
     * (예: 시작=전월 25일·마감=당월 24일이면 7/3 은 기준월 7월(6/25~7/24)에 속한다)
     */
    YearMonth resolveCurrentCycleMonth(PayrollCycle cycle, LocalDate today) {
        YearMonth now = YearMonth.from(today);
        for (YearMonth candidate : List.of(now.minusMonths(1), now, now.plusMonths(1))) {
            LocalDate start = cycle.resolveStart(candidate);
            LocalDate end = cycle.resolveEnd(candidate);
            if (start != null && end != null && !today.isBefore(start) && !today.isAfter(end)) {
                return candidate;
            }
        }
        // 설정 조합상 어느 주기에도 속하지 않으면(이례적) 당월 기준으로 폴백
        return now;
    }

    /** 기간 내 일자별 인건비 합 (출퇴근 기록 기반 — 퇴근 전 기록은 0시간으로 집계). */
    private Map<LocalDate, Long> laborCostByDate(Store store, LocalDate from, LocalDate to) {
        List<Attendance> attendances = attendanceRepository
                .findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        store, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        return attendances.stream()
                .filter(a -> a.getCheckInTime() != null && a.getAppliedHourlyWage() != null)
                .collect(Collectors.groupingBy(
                        a -> a.getCheckInTime().toLocalDate(),
                        Collectors.summingLong(a -> (long) a.calculateDailyWage())));
    }

    private long sumLaborCost(Store store, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            return 0L;
        }
        return laborCostByDate(store, from, to).values().stream().mapToLong(Long::longValue).sum();
    }

    /** 기간 내 매출 합 — 입력 건이 하나도 없으면 null (0원 입력과 구분). */
    private Long sumSales(Long storeId, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            return null;
        }
        List<DailySales> list = dailySalesRepository
                .findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(storeId, from, to);
        if (list.isEmpty()) {
            return null;
        }
        return list.stream().mapToLong(DailySales::getAmount).sum();
    }

    /** 인건비/매출 — 매출이 null 또는 0 이면 null. */
    private static Double ratio(long laborCost, Long sales) {
        if (sales == null || sales <= 0) {
            return null;
        }
        return (double) laborCost / sales;
    }

    private Store store(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));
    }
}
