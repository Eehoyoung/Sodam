package com.rich.sodam.domain;

import com.rich.sodam.domain.type.RecordedBy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * BreakRecord 직원 실시간 기록(startByEmployee/completeByEmployee) 도메인 룰 — 순수 단위 테스트.
 *
 * <p>급여 계산과 무관 — Attendance/WorkHoursCalculator 미참조. breakMinutes 자동계산 경계값과
 * 상태 전이(시작→종료, 중복 종료 방지)만 검증한다.
 */
class BreakRecordDomainTest {

    @Test
    @DisplayName("휴게 시작 시 recordedBy=EMPLOYEE, breakEndTime null, breakMinutes 0")
    void startByEmployee_초기상태() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 12, 0);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);

        assertEquals(RecordedBy.EMPLOYEE, record.getRecordedBy());
        assertEquals(start, record.getBreakStartTime());
        assertNull(record.getBreakEndTime());
        assertEquals(0, record.getBreakMinutes());
        assertFalse(record.isGrantedConfirmed());
        assertTrue(record.isInProgress());
        // workDate 는 시작 시각의 달력일 기준
        assertEquals(LocalDate.of(2026, 6, 16), record.getWorkDate());
    }

    @Test
    @DisplayName("1분 경계 — breakMinutes 정확히 1")
    void completeByEmployee_1분경계() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 12, 0);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);

        record.completeByEmployee(start.plusMinutes(1));

        assertEquals(1, record.getBreakMinutes());
        assertTrue(record.isGrantedConfirmed());
        assertFalse(record.isInProgress());
    }

    @Test
    @DisplayName("59분 경계 — breakMinutes 정확히 59")
    void completeByEmployee_59분경계() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 12, 0);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);

        record.completeByEmployee(start.plusMinutes(59));

        assertEquals(59, record.getBreakMinutes());
    }

    @Test
    @DisplayName("자정 넘김 시프트 중 휴게 — 23:50 시작, 다음날 00:10 종료 시 20분")
    void completeByEmployee_자정넘김() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 23, 50);
        LocalDateTime end = LocalDateTime.of(2026, 6, 17, 0, 10);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);

        record.completeByEmployee(end);

        assertEquals(20, record.getBreakMinutes());
        // workDate 는 시작일 유지(익일로 넘어가지 않음)
        assertEquals(LocalDate.of(2026, 6, 16), record.getWorkDate());
    }

    @Test
    @DisplayName("이미 종료된 기록에 재종료 시도 시 거부(IllegalStateException)")
    void completeByEmployee_재종료거부() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 12, 0);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);
        record.completeByEmployee(start.plusMinutes(30));

        assertThrows(IllegalStateException.class, () -> record.completeByEmployee(start.plusMinutes(40)));
    }

    @Test
    @DisplayName("종료 시각이 시작 시각 이전/동일이면 거부(IllegalArgumentException)")
    void completeByEmployee_종료시각오류() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 16, 12, 0);
        BreakRecord record = BreakRecord.startByEmployee(10L, 1L, start);

        assertThrows(IllegalArgumentException.class, () -> record.completeByEmployee(start));
        assertThrows(IllegalArgumentException.class, () -> record.completeByEmployee(start.minusMinutes(1)));
    }

    @Test
    @DisplayName("사장 사후입력 경로(create)는 recordedBy=MASTER, breakStartTime/EndTime 항상 null")
    void create_사장경로는_MASTER고정() {
        BreakRecord record = BreakRecord.create(10L, 1L, LocalDate.of(2026, 6, 16), 60, true, "점심 휴게");

        assertEquals(RecordedBy.MASTER, record.getRecordedBy());
        assertNull(record.getBreakStartTime());
        assertNull(record.getBreakEndTime());
        assertFalse(record.isInProgress());
    }
}
