package com.rich.sodam.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class StoreAttendanceWindowTest {

    @Test
    void attendanceWindowAllowsOneHourBeforeOpenAndAfterClose() {
        Store store = new Store("attendance-store", "1234567890", "02-555-1234", "cafe", 12_000, 100);
        LocalDate monday = LocalDate.of(2026, 6, 29);

        assertThat(store.isOpenAt(monday.atTime(8, 0))).isFalse();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(7, 59))).isFalse();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(8, 0))).isTrue();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(9, 0))).isTrue();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(18, 0))).isTrue();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(19, 0))).isTrue();
        assertThat(store.isWithinAttendanceWindowAt(monday.atTime(19, 1))).isFalse();
    }

    @Test
    void attendanceWindowCanCrossMidnight() {
        Store store = new Store("late-store", "1234567891", "02-555-1234", "cafe", 12_000, 100);
        OperatingHours hours = OperatingHours.createDefault();
        hours.setDayOperatingHours(LocalDate.of(2026, 6, 29).getDayOfWeek(),
                LocalDateTime.of(2026, 6, 29, 15, 0).toLocalTime(),
                LocalDateTime.of(2026, 6, 29, 23, 30).toLocalTime(),
                false);
        store.updateOperatingHours(hours);

        assertThat(store.isWithinAttendanceWindowAt(LocalDateTime.of(2026, 6, 30, 0, 30))).isTrue();
        assertThat(store.isWithinAttendanceWindowAt(LocalDateTime.of(2026, 6, 30, 0, 31))).isFalse();
    }
}
