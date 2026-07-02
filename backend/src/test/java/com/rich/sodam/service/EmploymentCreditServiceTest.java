package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.HeadcountTrendResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 통합고용세액공제 상시근로자 월별 증빙 (A3) — 월별 distinct 집계·전년 비교.
 */
class EmploymentCreditServiceTest {

    private final AttendanceRepository attendanceRepository = mock(AttendanceRepository.class);
    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final EmploymentCreditService service =
            new EmploymentCreditService(attendanceRepository, storeRepository);

    private Attendance att(long empId, LocalDateTime checkIn) {
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(empId);
        Attendance a = mock(Attendance.class);
        when(a.getEmployeeProfile()).thenReturn(e);
        when(a.getCheckInTime()).thenReturn(checkIn);
        return a;
    }

    @Test
    @DisplayName("월별 상시근로자 수(distinct) + 전년 대비 증가 신호")
    void monthlyHeadcountAndYoY() {
        Store store = mock(Store.class);
        when(storeRepository.findById(eq(1L))).thenReturn(Optional.of(store));

        // 2026: 3월 직원 10·20(2명), 7월 직원 10(1명) — 같은 직원 중복은 distinct
        Attendance mar1 = att(10L, LocalDateTime.of(2026, 3, 5, 9, 0));
        Attendance mar2 = att(20L, LocalDateTime.of(2026, 3, 6, 9, 0));
        Attendance mar3 = att(10L, LocalDateTime.of(2026, 3, 20, 9, 0)); // 중복 직원
        Attendance jul1 = att(10L, LocalDateTime.of(2026, 7, 1, 9, 0));
        // 2025: 3월 직원 10(1명)
        Attendance prior = att(10L, LocalDateTime.of(2025, 3, 5, 9, 0));

        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(any(), any(), any()))
                .thenReturn(List.of(mar1, mar2, mar3, jul1))   // 2026
                .thenReturn(List.of(prior));                    // 2025

        HeadcountTrendResponse res = service.headcountTrend(1L, 2026);

        assertThat(res.monthly()).hasSize(12);
        assertThat(res.monthly().get(2).headcount()).isEqualTo(2); // 3월
        assertThat(res.monthly().get(6).headcount()).isEqualTo(1); // 7월
        assertThat(res.monthly().get(0).headcount()).isZero();     // 1월
        assertThat(res.increasedVsPriorYear()).isTrue();           // 0.25 > 0.083
        assertThat(res.averageHeadcount()).isGreaterThan(res.priorYearAverage());
        assertThat(res.disclaimer()).contains("세무사");
    }
}
