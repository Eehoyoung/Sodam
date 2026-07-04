package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.dto.response.CycleLaborRatioDto;
import com.rich.sodam.dto.response.DailyLaborRatioDto;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.DailySalesRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * 인건비율 계산 — 출퇴근 기반 인건비 ÷ 일일 매출. 매출 없으면 ratio=null.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LaborRatioServiceTest {

    @Mock
    StoreRepository storeRepository;
    @Mock
    AttendanceRepository attendanceRepository;
    @Mock
    DailySalesRepository dailySalesRepository;
    @InjectMocks
    LaborRatioService service;

    private Store store;
    private EmployeeProfile employee;

    @BeforeEach
    void setUp() {
        store = new Store("인건비테스트매장", "1234567890", "02-1234-5678", "카페", 10_000, 100);
        employee = new EmployeeProfile(new User("emp@sodam.dev", "직원"));
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
    }

    /** 2시간 근무(시급 1만원) 출퇴근 기록 생성 → 일 인건비 2만원. */
    private Attendance attendanceOn(LocalDate date) {
        Attendance a = new Attendance(employee, store);
        a.manualCheckIn(date.atTime(9, 0), null, null, 10_000);
        a.manualCheckOut(date.atTime(11, 0), null, null);
        return a;
    }

    @Test
    @DisplayName("매출이 입력된 날은 ratio=인건비/매출, 미입력 날은 ratio=null")
    void dailyRatioNullWhenNoSales() {
        LocalDate d1 = LocalDate.of(2026, 7, 1);
        LocalDate d2 = LocalDate.of(2026, 7, 2);
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                eq(store), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(attendanceOn(d1), attendanceOn(d2)));
        // d1 만 매출 입력(10만원), d2 는 미입력
        when(dailySalesRepository.findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(eq(1L), any(), any()))
                .thenReturn(List.of(new DailySales(1L, d1, 100_000L)));

        List<DailyLaborRatioDto> result = service.daily(1L, d1, d2);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).date()).isEqualTo(d1);
        assertThat(result.get(0).laborCost()).isEqualTo(20_000L);
        assertThat(result.get(0).sales()).isEqualTo(100_000L);
        assertThat(result.get(0).ratio()).isEqualTo(0.2);
        // 매출 미입력 → ratio null (0 아님)
        assertThat(result.get(1).laborCost()).isEqualTo(20_000L);
        assertThat(result.get(1).sales()).isNull();
        assertThat(result.get(1).ratio()).isNull();
    }

    @Test
    @DisplayName("매출 0원 입력 시에도 ratio=null (0 나눗셈 방지)")
    void dailyRatioNullWhenZeroSales() {
        LocalDate d1 = LocalDate.of(2026, 7, 1);
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                eq(store), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(attendanceOn(d1)));
        when(dailySalesRepository.findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(eq(1L), any(), any()))
                .thenReturn(List.of(new DailySales(1L, d1, 0L)));

        List<DailyLaborRatioDto> result = service.daily(1L, d1, d1);

        assertThat(result.get(0).sales()).isZero();
        assertThat(result.get(0).ratio()).isNull();
    }

    @Test
    @DisplayName("기간이 뒤집히면 400")
    void rejectsInvalidRange() {
        assertThatThrownBy(() -> service.daily(1L, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("정산주기 미설정 매장은 cycle 조회 시 400")
    void cycleRejectsWhenNotConfigured() {
        assertThatThrownBy(() -> service.cycle(1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("정산주기 기준 — 매출 입력이 없으면 ratio·prevCycleRatio 모두 null")
    void cycleRatioNullWhenNoSales() {
        // 당월 1일 ~ 당월 말일, 지급 익월 10일
        store.updatePayrollCycle(PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 1,
                MonthOffset.CURRENT_MONTH, null, true,
                MonthOffset.NEXT_MONTH, 10, false));
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                eq(store), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(dailySalesRepository.findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(anyLong(), any(), any()))
                .thenReturn(List.of());

        CycleLaborRatioDto result = service.cycle(1L);

        YearMonth now = YearMonth.now();
        assertThat(result.cycleStart()).isEqualTo(now.atDay(1));
        assertThat(result.cycleEnd()).isEqualTo(now.atEndOfMonth());
        assertThat(result.laborCost()).isZero();
        assertThat(result.sales()).isNull();
        assertThat(result.ratio()).isNull();
        assertThat(result.prevCycleRatio()).isNull();
    }

    @Test
    @DisplayName("현재 주기 판정 — 전월 25일 시작·당월 24일 마감이면 25일 이후는 익월 기준월")
    void resolvesCrossMonthCycle() {
        PayrollCycle cycle = PayrollCycle.of(
                MonthOffset.PREV_MONTH, 25,
                MonthOffset.CURRENT_MONTH, 24, false,
                MonthOffset.CURRENT_MONTH, 25, false);

        // 7/3 → 6/25~7/24 주기(기준월 7월)
        assertThat(service.resolveCurrentCycleMonth(cycle, LocalDate.of(2026, 7, 3)))
                .isEqualTo(YearMonth.of(2026, 7));
        // 7/26 → 7/25~8/24 주기(기준월 8월)
        assertThat(service.resolveCurrentCycleMonth(cycle, LocalDate.of(2026, 7, 26)))
                .isEqualTo(YearMonth.of(2026, 8));
    }
}
