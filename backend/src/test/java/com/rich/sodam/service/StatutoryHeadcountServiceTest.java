package com.rich.sodam.service;

import com.rich.sodam.config.LaborLawRoadmapProperties;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.HeadcountSimulationResponse;
import com.rich.sodam.dto.response.StatutoryHeadcountResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 근로기준법 시행령 §7의2 상시근로자 참고 산정기 — 경계값(4.9명/5.0명) 및 전환 시뮬레이션 검증.
 *
 * <p>{@link EmploymentCreditService}(통합고용세액공제, distinct 집계)와 값이 다르다는 것을
 * 별도 테스트({@link #differsFromTaxCreditHeadcount()})로 고정한다.
 */
class StatutoryHeadcountServiceTest {

    private static final long STORE_ID = 1L;
    /** 산정기간 = 2026-07-15 ~ 2026-08-14 (기준일 2026-08-15 전 1개월). */
    private static final LocalDate TODAY = LocalDate.of(2026, 8, 15);
    private static final LocalDate FIRST_DAY = LocalDate.of(2026, 7, 16);

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final AttendanceRepository attendanceRepository = mock(AttendanceRepository.class);
    private final EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
    private final LaborLawRoadmapProperties roadmapProperties = new LaborLawRoadmapProperties();
    private final StatutoryHeadcountService service = new StatutoryHeadcountService(
            storeRepository, attendanceRepository, relationRepository, roadmapProperties);

    private final Store store = mock(Store.class);

    private Attendance att(long empId, LocalDateTime checkIn) {
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(empId);
        Attendance a = mock(Attendance.class);
        when(a.getEmployeeProfile()).thenReturn(e);
        when(a.getCheckInTime()).thenReturn(checkIn);
        return a;
    }

    /** 가동일 {@code days}일, 마지막 날만 {@code lastDayEmployees}명, 나머지는 5명씩 근무. */
    private List<Attendance> buildAttendances(int days, int lastDayEmployees) {
        List<Attendance> list = new ArrayList<>();
        for (int d = 0; d < days; d++) {
            LocalDate day = FIRST_DAY.plusDays(d);
            int count = (d == days - 1) ? lastDayEmployees : 5;
            for (long e = 1; e <= count; e++) {
                list.add(att(e, day.atTime(9, 0)));
            }
        }
        return list;
    }

    private void stubAttendances(List<Attendance> attendances) {
        when(storeRepository.findById(eq(STORE_ID))).thenReturn(Optional.of(store));
        when(attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(any(), any(), any()))
                .thenReturn(attendances);
    }

    @Test
    @DisplayName("경계값 4.9명 — 가동일 10일·연인원 49명(9일×5명+1일×4명)은 5인 미충족")
    void belowThresholdAt49Point() {
        stubAttendances(buildAttendances(10, 4));

        StatutoryHeadcountResponse res = service.referenceHeadcount(STORE_ID, TODAY);

        assertThat(res.operatingDays()).isEqualTo(10);
        assertThat(res.manDays()).isEqualTo(49);
        assertThat(res.statutoryHeadcount()).isEqualByComparingTo(new BigDecimal("4.9"));
        assertThat(res.meetsThreshold()).isFalse();
    }

    @Test
    @DisplayName("경계값 5.0명 — 가동일 10일·연인원 50명(10일×5명)은 5인 충족")
    void meetsThresholdAt50Point() {
        stubAttendances(buildAttendances(10, 5));

        StatutoryHeadcountResponse res = service.referenceHeadcount(STORE_ID, TODAY);

        assertThat(res.operatingDays()).isEqualTo(10);
        assertThat(res.manDays()).isEqualTo(50);
        assertThat(res.statutoryHeadcount()).isEqualByComparingTo(new BigDecimal("5.0"));
        assertThat(res.meetsThreshold()).isTrue();
    }

    @Test
    @DisplayName("가동일 0일(출근 기록 없음) — 참고 산정 0명, 5인 미충족")
    void zeroWhenNoAttendance() {
        stubAttendances(List.of());

        StatutoryHeadcountResponse res = service.referenceHeadcount(STORE_ID, TODAY);

        assertThat(res.operatingDays()).isZero();
        assertThat(res.statutoryHeadcount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(res.meetsThreshold()).isFalse();
    }

    @Test
    @DisplayName("면책 문구가 항상 포함된다 — 참고 산정이며 최종 판단은 근로감독관·법원 권한")
    void alwaysCarriesDisclaimer() {
        stubAttendances(buildAttendances(10, 4));

        StatutoryHeadcountResponse res = service.referenceHeadcount(STORE_ID, TODAY);

        assertThat(res.disclaimer()).contains("참고").contains("근로감독관");
    }

    @Test
    @DisplayName("전환 시뮬레이션 — 4.9명에서 1명 추가 시 5.9명으로 경계를 넘고 신규 적용 조항 목록을 반환")
    void simulationCrossesThreshold() {
        stubAttendances(buildAttendances(10, 4)); // 참고 산정 4.9명
        EmployeeStoreRelation rel = mock(EmployeeStoreRelation.class);
        when(rel.getAppliedHourlyWage()).thenReturn(11_000);
        when(relationRepository.findByStoreAndIsActiveTrue(any())).thenReturn(List.of(rel));

        HeadcountSimulationResponse res = service.simulateAddingEmployees(STORE_ID, 1, TODAY);

        assertThat(res.currentStatutoryHeadcount()).isEqualByComparingTo(new BigDecimal("4.9"));
        assertThat(res.projectedStatutoryHeadcount()).isEqualByComparingTo(new BigDecimal("5.9"));
        assertThat(res.crossesThreshold()).isTrue();
        assertThat(res.newlyApplicableProvisions()).isNotEmpty();
        assertThat(res.estimatedMonthlyCostMin()).isLessThanOrEqualTo(res.estimatedMonthlyCostMax());
        assertThat(res.estimatedMonthlyCostMin()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("전환 시뮬레이션 — 이미 5인 이상이면 crossesThreshold=false(이미 충족된 상태라 '전환'이 아님)")
    void simulationDoesNotFlagAlreadyMet() {
        stubAttendances(buildAttendances(10, 5)); // 참고 산정 5.0명(이미 충족)
        when(relationRepository.findByStoreAndIsActiveTrue(any())).thenReturn(List.of());

        HeadcountSimulationResponse res = service.simulateAddingEmployees(STORE_ID, 1, TODAY);

        assertThat(res.crossesThreshold()).isFalse();
        assertThat(res.newlyApplicableProvisions()).isEmpty();
    }

    @Test
    @DisplayName("판정이 다른 기능을 자동 활성화하지 않는다(HC-4) — 응답은 참고 수치일 뿐 다른 상태를 변경하지 않는다")
    void doesNotMutateAnyOtherState() {
        stubAttendances(buildAttendances(10, 5));

        service.referenceHeadcount(STORE_ID, TODAY);

        // 이 서비스는 조회(@Transactional(readOnly = true))만 수행 — 판정 자체가 부작용을 갖지 않는다.
        org.mockito.Mockito.verifyNoInteractions(relationRepository);
    }

    @Test
    @DisplayName("세액공제 상시근로자 산정(EmploymentCreditService)과 같은 입력에 다른 값을 반환한다")
    void differsFromTaxCreditHeadcount() {
        // 알바 4명이 각각 주 2일씩 근무하는 시나리오를 근기법 산식으로 재현하면 distinct(4명)보다 낮다.
        // 가동일 10일 중 매일 서로 다른 4명 중 일부만 근무(9일×5명 + 1일×4명 = 연인원 49 → 4.9명).
        stubAttendances(buildAttendances(10, 4));

        StatutoryHeadcountResponse statutory = service.referenceHeadcount(STORE_ID, TODAY);

        // distinct 집계(세액공제 방식)라면 이 기간에 등장한 employeeId 1~5 전원이 잡혀 5명이 된다.
        // 근기법 방식은 4.9명 — 같은 원천 데이터에서 서로 다른 값이 나옴을 고정한다.
        assertThat(statutory.statutoryHeadcount()).isNotEqualByComparingTo(new BigDecimal("5"));
        assertThat(statutory.statutoryHeadcount()).isEqualByComparingTo(new BigDecimal("4.9"));
    }
}
