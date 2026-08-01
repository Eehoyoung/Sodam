package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExportServiceSecurityTest {

    @Test
    void prefixesFormulaLikeEmployeeNameInAttendanceCsv() {
        StoreRepository storeRepository = mock(StoreRepository.class);
        AttendanceRepository attendanceRepository = mock(AttendanceRepository.class);
        PayrollRepository payrollRepository = mock(PayrollRepository.class);
        ExportService service = new ExportService(attendanceRepository, payrollRepository, storeRepository);

        Store store = mock(Store.class);
        Attendance attendance = mock(Attendance.class);
        EmployeeProfile employee = mock(EmployeeProfile.class);
        User user = mock(User.class);

        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                eq(store), any(), any())).thenReturn(List.of(attendance));
        when(attendance.getEmployeeProfile()).thenReturn(employee);
        when(employee.getId()).thenReturn(7L);
        when(employee.getUser()).thenReturn(user);
        when(user.getName()).thenReturn("=HYPERLINK(\"https://attacker.invalid\")");
        when(attendance.getCheckInTime()).thenReturn(LocalDateTime.of(2026, 7, 30, 9, 0));
        when(attendance.getCheckOutTime()).thenReturn(LocalDateTime.of(2026, 7, 30, 18, 0));
        when(attendance.getWorkingTimeInMinutes()).thenReturn(540L);
        when(attendance.getAppliedHourlyWage()).thenReturn(10_000);
        when(attendance.calculateDailyWage()).thenReturn(90_000);

        String csv = service.buildAttendanceCsv(1L, LocalDate.of(2026, 7, 30), LocalDate.of(2026, 7, 30));

        assertThat(csv).contains("'=HYPERLINK");
        assertThat(csv).doesNotContain(",=HYPERLINK");

        for (String formulaLikeName : List.of("+SUM(1,1)", "-1+1", "@SUM(1)", "\t=1+1", " =1+1")) {
            when(user.getName()).thenReturn(formulaLikeName);

            String variantCsv = service.buildAttendanceCsv(
                    1L, LocalDate.of(2026, 7, 30), LocalDate.of(2026, 7, 30));

            assertThat(variantCsv).contains("'" + formulaLikeName);
        }
    }
}
