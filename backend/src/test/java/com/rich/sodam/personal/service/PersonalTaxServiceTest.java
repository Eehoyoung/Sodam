package com.rich.sodam.personal.service;

import com.rich.sodam.personal.domain.PersonalAttendance;
import com.rich.sodam.personal.domain.PersonalWorkplace;
import com.rich.sodam.personal.dto.PersonalAnnualTaxDto;
import com.rich.sodam.personal.repository.PersonalAttendanceRepository;
import com.rich.sodam.personal.repository.PersonalWorkplaceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 긱워커 연간 사업소득·환급 신호 (B3) — 근무지별 소득 합산·3.3% 추정.
 */
class PersonalTaxServiceTest {

    private final PersonalAttendanceRepository attendanceRepository = mock(PersonalAttendanceRepository.class);
    private final PersonalWorkplaceRepository workplaceRepository = mock(PersonalWorkplaceRepository.class);
    private final PersonalTaxService service =
            new PersonalTaxService(attendanceRepository, workplaceRepository);

    private PersonalWorkplace wp(long id, String name, int wage) {
        PersonalWorkplace w = mock(PersonalWorkplace.class);
        when(w.getId()).thenReturn(id);
        when(w.getName()).thenReturn(name);
        when(w.getHourlyWage()).thenReturn(wage);
        return w;
    }

    private PersonalAttendance att(long workplaceId, int minutes) {
        PersonalAttendance a = mock(PersonalAttendance.class);
        when(a.getWorkplaceId()).thenReturn(workplaceId);
        when(a.getDurationMinutes()).thenReturn(minutes);
        return a;
    }

    @Test
    @DisplayName("근무지별 소득 합산 + 3.3% 기납부 추정 + 환급 신호")
    void aggregatesAnnualIncome() {
        PersonalWorkplace cafe = wp(100L, "카페", 10_000);
        PersonalWorkplace store = wp(200L, "편의점", 12_000);
        when(workplaceRepository.findByUserId(1L)).thenReturn(List.of(cafe, store));

        PersonalAttendance a1 = att(100L, 600); // 10h × 10,000 = 100,000
        PersonalAttendance a2 = att(100L, 300); // 5h × 10,000 = 50,000
        PersonalAttendance a3 = att(200L, 120); // 2h × 12,000 = 24,000
        when(attendanceRepository.findByUserIdAndCheckInAtBetween(eq(1L), any(), any()))
                .thenReturn(List.of(a1, a2, a3));

        PersonalAnnualTaxDto res = service.annualSummary(1L, 2026);

        assertThat(res.totalIncome()).isEqualTo(174_000);
        assertThat(res.withheldEstimate()).isEqualTo(Math.round(174_000 * 0.033)); // 5,742
        assertThat(res.refundPossible()).isTrue();
        assertThat(res.perWorkplace()).hasSize(2);
        assertThat(res.disclaimer()).contains("홈택스");
    }

    @Test
    @DisplayName("근무 기록 없으면 소득 0·환급 신호 없음")
    void emptyWhenNoAttendance() {
        when(workplaceRepository.findByUserId(2L)).thenReturn(List.of());
        when(attendanceRepository.findByUserIdAndCheckInAtBetween(eq(2L), any(), any())).thenReturn(List.of());

        PersonalAnnualTaxDto res = service.annualSummary(2L, 2026);

        assertThat(res.totalIncome()).isZero();
        assertThat(res.refundPossible()).isFalse();
        assertThat(res.perWorkplace()).isEmpty();
    }
}
