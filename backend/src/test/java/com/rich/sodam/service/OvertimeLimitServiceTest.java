package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.OvertimeCheckResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 연장근로 한도(주 52h, §53) 경보 (B5) — 직원별·주별 실근로시간 합계 → 52h 초과 주 추출.
 *
 * <p>주 경계: ISO 주(월요일 시작). 테스트 기준 주 = 2026-06-01(월) ~ 06-07(일).
 */
class OvertimeLimitServiceTest {

    private final AttendanceRepository attendanceRepository = mock(AttendanceRepository.class);
    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final OvertimeLimitService service =
            new OvertimeLimitService(attendanceRepository, storeRepository);

    /** 2026-06-01 은 월요일(ISO 주 시작). */
    private static final LocalDate WEEK_START = LocalDate.of(2026, 6, 1);

    /** dayOffset 일째 hours 시간 근무한 출근 기록(시작 09:00). */
    private Attendance shift(long empId, String name, int dayOffset, double hours) {
        User user = mock(User.class);
        when(user.getName()).thenReturn(name);
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(empId);
        when(e.getUser()).thenReturn(user);

        LocalDateTime in = WEEK_START.plusDays(dayOffset).atTime(9, 0);
        LocalDateTime out = in.plusMinutes((long) Math.round(hours * 60));

        Attendance a = mock(Attendance.class);
        when(a.getEmployeeProfile()).thenReturn(e);
        when(a.getCheckInTime()).thenReturn(in);
        when(a.getCheckOutTime()).thenReturn(out);
        return a;
    }

    private void stubRows(List<Attendance> rows) {
        Store store = mock(Store.class);
        when(storeRepository.findById(eq(1L))).thenReturn(Optional.of(store));
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(any(), any(), any()))
                .thenReturn(rows);
    }

    @Test
    @DisplayName("한 직원 주 54h → 위반 1건(overBy 2)")
    void weekOver52IsViolation() {
        // 월~토 6일 × 9h = 54h (한 주)
        stubRows(List.of(
                shift(10L, "김알바", 0, 9),
                shift(10L, "김알바", 1, 9),
                shift(10L, "김알바", 2, 9),
                shift(10L, "김알바", 3, 9),
                shift(10L, "김알바", 4, 9),
                shift(10L, "김알바", 5, 9)));

        OvertimeCheckResponse res = service.checkYearMonth(1L, 2026, 6);

        assertThat(res.hasViolation()).isTrue();
        assertThat(res.violations()).hasSize(1);
        OvertimeCheckResponse.Violation v = res.violations().get(0);
        assertThat(v.employeeId()).isEqualTo(10L);
        assertThat(v.employeeName()).isEqualTo("김알바");
        assertThat(v.weekStart()).isEqualTo(WEEK_START);
        assertThat(v.weeklyHours()).isCloseTo(54.0, within(0.01));
        assertThat(v.overBy()).isCloseTo(2.0, within(0.01));
        assertThat(res.disclaimer()).contains("노무사");
    }

    @Test
    @DisplayName("한 직원 주 48h → 위반 0")
    void weekUnder52NoViolation() {
        // 월~토 6일 × 8h = 48h
        stubRows(List.of(
                shift(20L, "박파트", 0, 8),
                shift(20L, "박파트", 1, 8),
                shift(20L, "박파트", 2, 8),
                shift(20L, "박파트", 3, 8),
                shift(20L, "박파트", 4, 8),
                shift(20L, "박파트", 5, 8)));

        OvertimeCheckResponse res = service.checkYearMonth(1L, 2026, 6);

        assertThat(res.hasViolation()).isFalse();
        assertThat(res.violations()).isEmpty();
    }

    @Test
    @DisplayName("경계 정확히 주 52h → 위반 0 (초과만 위반)")
    void weekExactly52NoViolation() {
        // 월~금 4일 × 12h + 1일 4h = 52h
        stubRows(List.of(
                shift(30L, "이정규", 0, 12),
                shift(30L, "이정규", 1, 12),
                shift(30L, "이정규", 2, 12),
                shift(30L, "이정규", 3, 12),
                shift(30L, "이정규", 4, 4)));

        OvertimeCheckResponse res = service.checkYearMonth(1L, 2026, 6);

        assertThat(res.hasViolation()).isFalse();
        assertThat(res.violations()).isEmpty();
    }
}
