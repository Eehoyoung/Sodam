package com.rich.sodam.service;

import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 출근 셀프 리마인드 (E-NEW-07) — [15,30)분 전 창 판정.
 */
class ShiftReminderSchedulerTest {

    private final ShiftReminderScheduler scheduler = new ShiftReminderScheduler(
            mock(WorkShiftRepository.class), mock(NotificationService.class));

    private WorkShift shift(LocalTime start) {
        WorkShift s = mock(WorkShift.class);
        when(s.getEmployeeId()).thenReturn(1L);
        when(s.getShiftDate()).thenReturn(LocalDate.of(2026, 6, 17));
        when(s.getStartTime()).thenReturn(start);
        return s;
    }

    @Test
    @DisplayName("시작 20분 전 → 리마인드 대상")
    void within20min() {
        WorkShift s = shift(LocalTime.of(10, 0));
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 9, 40))).isTrue();
    }

    @Test
    @DisplayName("창 경계: 15분 포함, 30분 제외, 10분(너무 임박) 제외")
    void windowBoundaries() {
        WorkShift s = shift(LocalTime.of(10, 0));
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 9, 45))).isTrue();  // 15분
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 9, 30))).isFalse(); // 30분(제외)
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 9, 50))).isFalse(); // 10분
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 7, 0))).isFalse();  // 3시간
    }

    @Test
    @DisplayName("시작시간 누락이면 대상 아님")
    void nullStartNotDue() {
        WorkShift s = shift(null);
        assertThat(scheduler.isDue(s, LocalDateTime.of(2026, 6, 17, 9, 40))).isFalse();
    }
}
