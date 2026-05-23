package com.rich.sodam.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 출퇴근 도메인 핵심 룰 검증 — 외부 의존성 없는 순수 단위 테스트.
 *
 * 작은 단위로 분할해 로컬 리소스 부담을 최소화한다 (각 테스트 < 5ms 목표).
 */
class AttendanceDomainTest {

    private Store buildStore() {
        Store store = new Store(
                "테스트 매장",
                "1234567890",
                "02-555-1234",
                "음식점",
                12_000,
                100
        );
        store.updateLocation(37.5665, 126.9780, "서울특별시 중구 세종대로 110", 100);
        return store;
    }

    private EmployeeProfile buildEmployee() {
        User user = new User("staff@example.com", "테스트 직원");
        EmployeeProfile profile = new EmployeeProfile(user);
        return profile;
    }

    @Test
    void checkIn_정상() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        attendance.checkIn(37.5665, 126.9780, 12_000);

        assertNotNull(attendance.getCheckInTime());
        assertEquals(37.5665, attendance.getCheckInLatitude());
        assertEquals(126.9780, attendance.getCheckInLongitude());
        assertEquals(12_000, attendance.getAppliedHourlyWage());
    }

    @Test
    void checkIn_이미출근시예외() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        attendance.checkIn(37.5665, 126.9780, 12_000);

        assertThrows(IllegalStateException.class,
                () -> attendance.checkIn(37.5665, 126.9780, 12_000));
    }

    @Test
    void checkOut_출근없으면예외() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        assertThrows(IllegalStateException.class,
                () -> attendance.checkOut(37.5665, 126.9780));
    }

    @Test
    void checkOut_중복퇴근예외() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        attendance.checkIn(37.5665, 126.9780, 12_000);
        attendance.checkOut(37.5665, 126.9780);

        assertThrows(IllegalStateException.class,
                () -> attendance.checkOut(37.5665, 126.9780));
    }

    @Test
    void manualCheckOut_퇴근시각이출근보다이르면예외() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        java.time.LocalDateTime checkIn = java.time.LocalDateTime.of(2026, 5, 19, 9, 0);
        java.time.LocalDateTime invalidOut = java.time.LocalDateTime.of(2026, 5, 19, 8, 0);

        attendance.manualCheckIn(checkIn, 37.5665, 126.9780, 12_000);
        assertThrows(IllegalArgumentException.class,
                () -> attendance.manualCheckOut(invalidOut, 37.5665, 126.9780));
    }

    @Test
    void getWorkingTime_정확한분단위() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        java.time.LocalDateTime checkIn = java.time.LocalDateTime.of(2026, 5, 19, 9, 0);
        java.time.LocalDateTime checkOut = java.time.LocalDateTime.of(2026, 5, 19, 17, 30);

        attendance.manualCheckIn(checkIn, 37.5665, 126.9780, 12_000);
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);

        assertEquals(510L, attendance.getWorkingTimeInMinutes());
        assertEquals(8.5, attendance.getWorkingTimeInHours(), 0.01);
    }

    @Test
    void calculateDailyWage_정확한금액() {
        Attendance attendance = new Attendance(buildEmployee(), buildStore());
        java.time.LocalDateTime checkIn = java.time.LocalDateTime.of(2026, 5, 19, 9, 0);
        java.time.LocalDateTime checkOut = java.time.LocalDateTime.of(2026, 5, 19, 17, 0); // 8시간

        attendance.manualCheckIn(checkIn, 37.5665, 126.9780, 12_000);
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);

        // 8시간 × 12,000원 = 96,000원
        assertEquals(96_000, attendance.calculateDailyWage());
    }
}
