package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceIrregularity;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.AttendanceIrregularityResolution;
import com.rich.sodam.domain.type.AttendanceIrregularityType;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.repository.AttendanceIrregularityRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 월급제 정규직 지각/조퇴/결근 자동 감지 + 사장 확정(공제/공제안함/연차전환) 검증.
 *
 * <p>통상시급 기준값: 월급 2,200,000 ÷ 209h = 10,526원(HALF_UP).</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceIrregularityServiceTest {

    private static final int MONTHLY_SALARY = 2_200_000;
    private static final int ORDINARY_WAGE = 10_526;

    @Autowired private AttendanceIrregularityService irregularityService;
    @Autowired private AttendanceIrregularityRepository irregularityRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private PayrollPolicyRepository payrollPolicyRepository;
    @Autowired private WorkShiftRepository workShiftRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private TimeOffRepository timeOffRepository;

    private int seq = 0;

    private Store store() {
        String biz = String.format("%010d", 7770001110L + (seq++));
        Store s = storeRepository.save(new Store("근태이상매장", biz, "02-777-0000", "카페", 10_320, 100));
        PayrollPolicy policy = new PayrollPolicy();
        policy.setStore(s);
        policy.setTaxPolicyType(TaxPolicyType.INCOME_TAX_3_3);
        policy.setNightWorkRate(1.5);
        policy.setOvertimeRate(1.5);
        policy.setRegularHoursPerDay(8.0);
        policy.setWeeklyAllowanceEnabled(true);
        policy.setNightWorkStartTime(LocalTime.of(22, 0));
        payrollPolicyRepository.save(policy);
        return s;
    }

    private EmployeeStoreRelation monthlyEmployee(Store store, String email) {
        User u = userRepository.save(new User(email, "월급직원" + seq));
        EmployeeProfile emp = employeeProfileRepository.save(new EmployeeProfile(u));
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store);
        rel.setEmploymentType(EmploymentType.MONTHLY_SALARY);
        rel.setMonthlySalary(MONTHLY_SALARY);
        rel.setContractedWeeklyDays(5);
        rel.setHireDate(LocalDate.now().minusYears(1));
        return relationRepository.save(rel);
    }

    private EmployeeStoreRelation hourlyEmployee(Store store, String email) {
        User u = userRepository.save(new User(email, "시급직원" + seq));
        EmployeeProfile emp = employeeProfileRepository.save(new EmployeeProfile(u));
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, null);
        rel.setHireDate(LocalDate.now().minusYears(1));
        return relationRepository.save(rel);
    }

    private WorkShift confirmedShift(EmployeeStoreRelation rel, LocalDate date, LocalTime start, LocalTime end) {
        WorkShift shift = WorkShift.create(rel.getEmployeeProfile().getId(), rel.getStore().getId(), date, start, end, null);
        shift.confirm();
        return workShiftRepository.save(shift);
    }

    private void attend(EmployeeStoreRelation rel, LocalDateTime checkIn, LocalDateTime checkOut) {
        Attendance a = new Attendance(rel.getEmployeeProfile(), rel.getStore());
        a.manualCheckIn(checkIn, null, null, rel.getStore().getStoreStandardHourWage());
        if (checkOut != null) {
            a.manualCheckOut(checkOut, null, null);
        }
        attendanceRepository.save(a);
    }

    @Test
    @DisplayName("예정보다 늦게 출근하면 LATE 로 감지된다")
    void detectsLate() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "late@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 15), shiftDate.atTime(18, 0));

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getType()).isEqualTo(AttendanceIrregularityType.LATE);
        assertThat(items.get(0).getMinutesShort()).isEqualTo(15);
        assertThat(items.get(0).getResolution()).isEqualTo(AttendanceIrregularityResolution.PENDING);
    }

    @Test
    @DisplayName("예정보다 일찍 퇴근하면 EARLY_LEAVE 로 감지된다")
    void detectsEarlyLeave() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "early@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 0), shiftDate.atTime(17, 30));

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getType()).isEqualTo(AttendanceIrregularityType.EARLY_LEAVE);
        assertThat(items.get(0).getMinutesShort()).isEqualTo(30);
    }

    @Test
    @DisplayName("출근 기록 자체가 없으면 ABSENCE 로 감지되고, 미근로시간은 소정근로시간 전체다")
    void detectsAbsence() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "absent@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).getType()).isEqualTo(AttendanceIrregularityType.ABSENCE);
        // 9h 시프트 − §54 휴게 1h = 8h(paidHours), 일 소정 8h 캡 — PayrollService 의 실제 공제 기준과 일치.
        assertThat(items.get(0).getMinutesShort()).isEqualTo(8 * 60);
    }

    @Test
    @DisplayName("승인된 휴가로 덮인 날은 결근으로 감지하지 않는다")
    void skipsDateCoveredByApprovedLeave() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "onleave@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));

        com.rich.sodam.domain.TimeOff timeOff = new com.rich.sodam.domain.TimeOff(
                rel.getEmployeeProfile(), rel.getStore(), shiftDate, shiftDate, "개인 사유");
        timeOff.approve();
        timeOffRepository.save(timeOff);

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(items).isEmpty();
    }

    @Test
    @DisplayName("아직 근무가 끝나지 않은(미래) 시프트는 판정하지 않는다")
    void doesNotDetectFutureOrInProgressShift() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "future@x.com");
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        confirmedShift(rel, tomorrow, LocalTime.of(9, 0), LocalTime.of(18, 0));

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), tomorrow, tomorrow);

        assertThat(items).isEmpty();
    }

    @Test
    @DisplayName("시급제 직원은 감지 대상이 아니다(실근로시간만큼만 지급되어 이중공제가 됨)")
    void doesNotDetectForHourlyEmployee() {
        Store store = store();
        EmployeeStoreRelation rel = hourlyEmployee(store, "hourly@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(items).isEmpty();
    }

    @Test
    @DisplayName("같은 구간을 다시 조회해도 감지 건이 중복 생성되지 않는다")
    void detectionIsIdempotent() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "idem@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 15), shiftDate.atTime(18, 0));

        irregularityService.listForStore(store.getId(), shiftDate, shiftDate);
        List<AttendanceIrregularity> second = irregularityService.listForStore(store.getId(), shiftDate, shiftDate);

        assertThat(second).hasSize(1);
    }

    @Test
    @DisplayName("공제 확정 시 통상시급 × 미근로시간(분)으로 금액이 계산된다")
    void deductComputesOrdinaryWageAmount() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "deduct@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 30), shiftDate.atTime(18, 0)); // 30분 지각

        AttendanceIrregularity item = irregularityService.listForStore(store.getId(), shiftDate, shiftDate).get(0);
        AttendanceIrregularity resolved = irregularityService.deduct(item.getId(), 1L, "지각 사유 불충분");

        assertThat(resolved.getResolution()).isEqualTo(AttendanceIrregularityResolution.DEDUCTED);
        int expected = (int) Math.round(ORDINARY_WAGE * 0.5); // 30분 = 0.5시간
        assertThat(resolved.getDeductedAmount()).isEqualTo(expected);
    }

    @Test
    @DisplayName("공제 없이 처리하면 deductedAmount 가 없고 급여에 영향을 주지 않는다")
    void waiveSkipsDeduction() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "waive@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 30), shiftDate.atTime(18, 0));

        AttendanceIrregularity item = irregularityService.listForStore(store.getId(), shiftDate, shiftDate).get(0);
        AttendanceIrregularity resolved = irregularityService.waive(item.getId(), 1L, "교통사고 확인됨");

        assertThat(resolved.getResolution()).isEqualTo(AttendanceIrregularityResolution.WAIVED);
        assertThat(resolved.getDeductedAmount()).isNull();
    }

    @Test
    @DisplayName("연차 전환 시 지각/조퇴는 반차, 결근은 종일 연차가 승인 상태로 생성된다")
    void convertToLeaveCreatesApprovedTimeOff() {
        Store store = store();
        // §11: 5인 미만 사업장은 연차(§60) 적용제외 — isFiveOrMoreEmployees 는 실제 활성 관계 수를 세므로
        // 전환 검증(잔여 연차)을 통과시키려면 활성 직원을 4명 더 채워 5인 이상으로 만든다.
        for (int i = 0; i < 4; i++) {
            hourlyEmployee(store, "filler" + i + "@x.com");
        }
        EmployeeStoreRelation rel = monthlyEmployee(store, "convert@x.com");
        rel.setHireDate(LocalDate.now().minusYears(3)); // 잔여 연차 검증 통과를 위해 충분히 오래 재직
        relationRepository.save(rel);
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        // 결근(출근 기록 없음)

        AttendanceIrregularity item = irregularityService.listForStore(store.getId(), shiftDate, shiftDate).get(0);
        assertThat(item.getType()).isEqualTo(AttendanceIrregularityType.ABSENCE);

        AttendanceIrregularity resolved = irregularityService.convertToLeave(item.getId(), 1L, "연차로 대체");

        assertThat(resolved.getResolution()).isEqualTo(AttendanceIrregularityResolution.CONVERTED_TO_LEAVE);
        List<com.rich.sodam.domain.TimeOff> timeOffs = timeOffRepository.findByEmployee(rel.getEmployeeProfile());
        assertThat(timeOffs).hasSize(1);
        assertThat(timeOffs.get(0).getStatus()).isEqualTo(TimeOffStatus.APPROVED);
        assertThat(timeOffs.get(0).getUnit()).isEqualTo(com.rich.sodam.domain.type.TimeOffUnit.FULL_DAY);
    }

    @Test
    @DisplayName("이미 처리된 건을 다시 처리하려 하면 거부된다")
    void resolvingAlreadyResolvedThrows() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "double@x.com");
        LocalDate shiftDate = LocalDate.now().minusDays(3);
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, shiftDate.atTime(9, 30), shiftDate.atTime(18, 0));

        AttendanceIrregularity item = irregularityService.listForStore(store.getId(), shiftDate, shiftDate).get(0);
        irregularityService.waive(item.getId(), 1L, "1차 처리");

        assertThatThrownBy(() -> irregularityService.deduct(item.getId(), 1L, "2차 처리"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("waivedMinutesByDate 는 WAIVED 건의 날짜별 미근무분(분)만 반환한다")
    void waivedMinutesByDateOnlyCountsWaived() {
        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "sum@x.com");
        LocalDate d1 = LocalDate.now().minusDays(5);
        LocalDate d2 = LocalDate.now().minusDays(3);
        confirmedShift(rel, d1, LocalTime.of(9, 0), LocalTime.of(18, 0));
        confirmedShift(rel, d2, LocalTime.of(9, 0), LocalTime.of(18, 0));
        attend(rel, d1.atTime(9, 30), d1.atTime(18, 0)); // 30분 지각 → 공제 확인(그대로 둠)
        // d2 는 결근 → 공제 없이 처리(waive)

        List<AttendanceIrregularity> items = irregularityService.listForStore(store.getId(), d1, d2);
        AttendanceIrregularity late = items.stream().filter(i -> i.getShiftDate().equals(d1)).findFirst().orElseThrow();
        AttendanceIrregularity absence = items.stream().filter(i -> i.getShiftDate().equals(d2)).findFirst().orElseThrow();

        irregularityService.deduct(late.getId(), 1L, null);
        irregularityService.waive(absence.getId(), 1L, "가족 상 확인됨");

        var waivedMinutes = irregularityService.waivedMinutesByDate(
                rel.getEmployeeProfile().getId(), store.getId(), d1, d2);
        assertThat(waivedMinutes).containsOnlyKeys(d2);
        assertThat(waivedMinutes.get(d2)).isEqualTo(8 * 60);
    }

    @Test
    @DisplayName("결근을 공제 없이 처리(waive)하면 실제 정산에서 그 날의 자동 공제가 취소된다")
    void waivingAbsence_restoresPayInActualPayroll() {
        // 지난달 전체를 정산기간으로 써서(월급 전액 기준) 결근 하루의 공제 효과를 정확히 분리 관찰한다.
        java.time.YearMonth lastMonth = java.time.YearMonth.from(LocalDate.now().minusMonths(1));
        LocalDate periodStart = lastMonth.atDay(1);
        LocalDate periodEnd = lastMonth.atEndOfMonth();
        LocalDate shiftDate = periodStart.plusDays(5);

        Store store = store();
        EmployeeStoreRelation rel = monthlyEmployee(store, "restore@x.com");
        rel.setHireDate(periodStart.minusYears(1));
        confirmedShift(rel, shiftDate, LocalTime.of(9, 0), LocalTime.of(18, 0));
        // 결근(출근 기록 없음)

        AttendanceIrregularity item = irregularityService.listForStore(store.getId(), shiftDate, shiftDate).get(0);
        int forgivenMinutes = item.getMinutesShort();

        com.rich.sodam.domain.Payroll before = payrollService.calculatePayroll(
                rel.getEmployeeProfile().getId(), store.getId(), periodStart, periodEnd);
        int expectedDeduction = (int) Math.round(ORDINARY_WAGE * (forgivenMinutes / 60.0));
        assertThat(before.getRegularWage()).isEqualTo(MONTHLY_SALARY - expectedDeduction);

        irregularityService.waive(item.getId(), 1L, "병가 확인됨");

        com.rich.sodam.domain.Payroll after = payrollService.calculatePayroll(
                rel.getEmployeeProfile().getId(), store.getId(), periodStart, periodEnd, true);
        assertThat(after.getRegularWage()).isEqualTo(MONTHLY_SALARY);
    }

    @Autowired private PayrollService payrollService;
}
