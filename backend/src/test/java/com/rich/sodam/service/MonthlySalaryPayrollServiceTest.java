package com.rich.sodam.service;

import com.rich.sodam.core.payroll.deduction.SocialInsuranceCalculator;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 월급제(MONTHLY_SALARY) 급여 계산 경계값 테스트.
 *
 * <p>고정 기준값(월 220만원, 주 5일):
 * <ul>
 *   <li>통상시급 = 2,200,000 ÷ 209h = 10,526원 (시행령 §6②)</li>
 *   <li>통상일급(8h) = 10,526 × 8 = 84,208원</li>
 *   <li>주휴수당 = 0 (월급에 내재 — 209h 에 주휴 35h 포함, 별도 가산 시 이중지급)</li>
 * </ul>
 * 기간은 2025년 4월(1일 화요일, 평일 22일) 고정 — now() 의존 없는 결정적 테스트.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MonthlySalaryPayrollServiceTest {

    private static final int MONTHLY_SALARY = 2_200_000;
    private static final int ORDINARY_WAGE = 10_526;          // 2,200,000 / 209 (HALF_UP)
    private static final int ORDINARY_DAILY = ORDINARY_WAGE * 8; // 84,208
    private static final LocalDate PERIOD_START = LocalDate.of(2025, 4, 1);
    private static final LocalDate PERIOD_END = LocalDate.of(2025, 4, 30);
    private static final LocalDate HIRED_LONG_AGO = LocalDate.of(2024, 1, 1);

    @Autowired
    private PayrollService payrollService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Autowired
    private AttendanceRepository attendanceRepository;
    @Autowired
    private PayrollPolicyRepository payrollPolicyRepository;
    @Autowired
    private WorkShiftRepository workShiftRepository;
    @Autowired
    private TimeOffRepository timeOffRepository;
    @Autowired
    private SocialInsuranceCalculator socialInsuranceCalculator;

    private Store store;

    @BeforeEach
    void setUp() {
        store = createStore("월급제테스트매장", "1234567890", TaxPolicyType.INCOME_TAX_3_3);
    }

    // ── 기본 경로 ──────────────────────────────────────────────

    @Test
    @DisplayName("스케줄 미사용 매장: 결근 판정 불가 → 공제 없이 월급 전액 + 주휴 0 (내재)")
    void fullMonth_noSchedule_paysFullSalary() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m1@t.dev", HIRED_LONG_AGO, null);
        // 평일 8시간 정상 근무 (가산 없음)
        for (LocalDate d : aprilWeekdays()) {
            createAttendance(relation, d.atTime(9, 0), d.atTime(18, 0));
        }

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getBaseHourlyWage()).isEqualTo(ORDINARY_WAGE);
        assertThat(payroll.getRegularWage()).isEqualTo(MONTHLY_SALARY);
        assertThat(payroll.getOvertimeWage()).isZero();
        // 월급제 주휴수당 = 0 (209h 월급에 주휴 35h 내재 — 별도 가산은 이중지급)
        assertThat(payroll.getWeeklyAllowance()).isZero();
        assertThat(payroll.getGrossWage()).isEqualTo(MONTHLY_SALARY);
        // 3.3% 원천징수 (개인 오버라이드 null → 매장 정책)
        assertThat(payroll.getTaxRate()).isEqualTo(0.033);
        assertThat(payroll.getTaxAmount()).isEqualTo(72_600); // 2,200,000 × 0.033
        assertThat(payroll.getNetWage()).isEqualTo(MONTHLY_SALARY - 72_600);
    }

    @Test
    @DisplayName("결근 0일(확정 시프트 전일 출근) → 공제 0, 월급 전액")
    void fullSchedule_fullAttendance_noDeduction() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m2@t.dev", HIRED_LONG_AGO, null);
        for (LocalDate d : aprilWeekdays()) {
            createConfirmedShift(relation, d, LocalTime.of(9, 0), LocalTime.of(18, 0));
            createAttendance(relation, d.atTime(9, 0), d.atTime(18, 0));
        }

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getRegularWage()).isEqualTo(MONTHLY_SALARY);
        assertThat(payroll.getGrossWage()).isEqualTo(MONTHLY_SALARY);
    }

    // ── 결근·지각 공제 ─────────────────────────────────────────

    @Test
    @DisplayName("월 전체 결근(확정 시프트 22일, 출근 0) → 통상시급×8h×22일 공제, 월급 내재 주휴분은 잔존")
    void fullMonthAbsence_deductsAllScheduledHours() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m3@t.dev", HIRED_LONG_AGO, null);
        List<LocalDate> weekdays = aprilWeekdays();
        assertThat(weekdays).hasSize(22); // 2025년 4월 평일 수 전제 확인
        for (LocalDate d : weekdays) {
            createConfirmedShift(relation, d, LocalTime.of(9, 0), LocalTime.of(18, 0));
        }

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        // 공제 = 84,208 × 22 = 1,852,576 → 기본급 = 2,200,000 − 1,852,576 = 347,424
        // 잔존 347,424원은 209h 중 주휴분(35h)·평균주수 편차에 해당 — 결근 주(週) 주휴 상실 공제는
        // 자동 적용하지 않는 정책(과지급 방향 안전, 노무사 확인 항목). PayrollService 주석 참고.
        assertThat(payroll.getRegularWage()).isEqualTo(MONTHLY_SALARY - ORDINARY_DAILY * 22);
        assertThat(payroll.getRegularWage()).isEqualTo(347_424);
        assertThat(payroll.getWeeklyAllowance()).isZero();
    }

    @Test
    @DisplayName("지각 1분(09:01 출근) → 통상시급 × 미근무시간(0.02h)만 공제")
    void oneMinuteLate_deductsProRata() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m4@t.dev", HIRED_LONG_AGO, null);
        LocalDate day = LocalDate.of(2025, 4, 7); // 월요일
        createConfirmedShift(relation, day, LocalTime.of(9, 0), LocalTime.of(18, 0));
        createAttendance(relation, day.atTime(9, 1), day.atTime(18, 0));

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        // 실근로 8h59m → 0.01h 단위 반올림(WorkHoursCalculator round2) 8.98h → 휴게 1h 공제 → 7.98h
        // 미근무 = 8.00 − 7.98 = 0.02h → 공제 = round(10,526 × 0.02) = 211원
        assertThat(payroll.getRegularWage()).isEqualTo(MONTHLY_SALARY - 211);
        assertThat(payroll.getOvertimeWage()).isZero();
    }

    @Test
    @DisplayName("승인된 휴가(TimeOff APPROVED) 일자는 결근 공제 제외")
    void approvedTimeOff_notDeducted() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m5@t.dev", HIRED_LONG_AGO, null);
        LocalDate day = LocalDate.of(2025, 4, 8);
        createConfirmedShift(relation, day, LocalTime.of(9, 0), LocalTime.of(18, 0));
        TimeOff timeOff = new TimeOff(relation.getEmployeeProfile(), store, day, day, "연차");
        timeOff.approve();
        timeOffRepository.save(timeOff);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getRegularWage()).isEqualTo(MONTHLY_SALARY);
    }

    // ── 월 중도 입사 일할 ──────────────────────────────────────

    @Test
    @DisplayName("월중 입사(4/16) → 월급 × 15/30 일할 (역일수 방식)")
    void midMonthHire_prorated() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m6@t.dev", LocalDate.of(2025, 4, 16), null);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getRegularWage()).isEqualTo(1_100_000);
        assertThat(payroll.getGrossWage()).isEqualTo(1_100_000);
    }

    @Test
    @DisplayName("말일 입사(4/30) → 월급 × 1/30 = 73,333원")
    void lastDayHire_prorated() {
        EmployeeStoreRelation relation = createMonthlyEmployee("m7@t.dev", LocalDate.of(2025, 4, 30), null);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getRegularWage()).isEqualTo(73_333);
    }

    // ── §56 가산 (5인 미만 분기) ───────────────────────────────

    @Test
    @DisplayName("5인 이상: 연장 2h → 통상시급 × 2 × 1.5 가산 지급")
    void overtimePremium_fiveOrMore() {
        store.applyEmployeeCount(6);
        storeRepository.save(store);
        EmployeeStoreRelation relation = createMonthlyEmployee("m8@t.dev", HIRED_LONG_AGO, null);
        LocalDate day = LocalDate.of(2025, 4, 7);
        createAttendance(relation, day.atTime(9, 0), day.atTime(20, 0)); // 11h − 휴게1h = 10h → 연장 2h

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getOvertimeWage()).isEqualTo(Math.round(ORDINARY_WAGE * 2 * 1.5)); // 31,578
        assertThat(payroll.getGrossWage()).isEqualTo(MONTHLY_SALARY + 31_578);
    }

    @Test
    @DisplayName("5인 미만: 연장 2h → 가산 없이 기본 100%만 (§56 적용제외)")
    void overtimeNoPremium_underFive() {
        store.applyEmployeeCount(3);
        storeRepository.save(store);
        EmployeeStoreRelation relation = createMonthlyEmployee("m9@t.dev", HIRED_LONG_AGO, null);
        LocalDate day = LocalDate.of(2025, 4, 7);
        createAttendance(relation, day.atTime(9, 0), day.atTime(20, 0));

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getOvertimeWage()).isEqualTo(ORDINARY_WAGE * 2); // 21,052 (×1.0)
        assertThat(payroll.getGrossWage()).isEqualTo(MONTHLY_SALARY + 21_052);
    }

    // ── 개인별 4대보험 오버라이드 3분기 ────────────────────────

    @Test
    @DisplayName("socialInsuranceEnrolled=null → 매장 정책(3.3%) 그대로")
    void insuranceNull_followsStorePolicy() {
        EmployeeStoreRelation relation = createMonthlyEmployee("i1@t.dev", HIRED_LONG_AGO, null);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getTaxRate()).isEqualTo(0.033);
        assertThat(payroll.getTaxAmount()).isEqualTo((int) Math.round(MONTHLY_SALARY * 0.033));
        assertThat(payroll.getNationalPensionDeduction()).isNull();
    }

    @Test
    @DisplayName("socialInsuranceEnrolled=true → 매장 정책(3.3%)을 오버라이드해 4대보험 공제")
    void insuranceTrue_overridesToFourInsurances() {
        EmployeeStoreRelation relation = createMonthlyEmployee("i2@t.dev", HIRED_LONG_AGO, true);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getTaxRate()).isEqualTo(0.0916);
        assertThat(payroll.getTaxAmount())
                .isEqualTo(socialInsuranceCalculator.totalEmployeeDeduction(MONTHLY_SALARY));
        // 임금명세서(§48②) 항목별 공제내역 저장 확인
        assertThat(payroll.getNationalPensionDeduction())
                .isEqualTo(socialInsuranceCalculator.nationalPension(MONTHLY_SALARY));
        assertThat(payroll.getHealthInsuranceDeduction()).isNotNull();
    }

    @Test
    @DisplayName("socialInsuranceEnrolled=false → 매장 정책(4대보험)을 오버라이드해 3.3% 원천징수")
    void insuranceFalse_overridesToWithholding() {
        Store fourInsuranceStore = createStore("4대보험매장", "9876543211", TaxPolicyType.FOUR_INSURANCES);
        EmployeeStoreRelation relation = createMonthlyEmployeeAt(
                fourInsuranceStore, "i3@t.dev", HIRED_LONG_AGO, false);

        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), fourInsuranceStore.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getTaxRate()).isEqualTo(0.033);
        assertThat(payroll.getTaxAmount()).isEqualTo((int) Math.round(MONTHLY_SALARY * 0.033));
        assertThat(payroll.getNationalPensionDeduction()).isNull();
    }

    // ── 시급제 회귀 확인 ───────────────────────────────────────

    @Test
    @DisplayName("시급제 직원(기본값)은 기존 계산 그대로 — 시급×시간, 오버라이드 null이면 매장 정책")
    void hourlyEmployee_unchangedPath() {
        User user = createUser("h1@t.dev", "시급직원");
        EmployeeProfile employee = employeeProfileRepository.save(new EmployeeProfile(user));
        EmployeeStoreRelation relation = new EmployeeStoreRelation(employee, store, 15_000);
        relation.setHireDate(HIRED_LONG_AGO);
        relation = employeeStoreRelationRepository.save(relation);
        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.HOURLY); // 기본값 확인

        LocalDate day = LocalDate.of(2025, 4, 7);
        createAttendance(relation, day.atTime(9, 0), day.atTime(18, 0)); // 순 8h

        Payroll payroll = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PERIOD_START, PERIOD_END);

        assertThat(payroll.getBaseHourlyWage()).isEqualTo(15_000);
        assertThat(payroll.getRegularWage()).isEqualTo(120_000); // 15,000 × 8h — 월급 로직 미개입
        assertThat(payroll.getTaxRate()).isEqualTo(0.033);       // 매장 정책 그대로
    }

    // ── 헬퍼 ──────────────────────────────────────────────────

    /** 2025년 4월의 평일(월~금) 22일. */
    private List<LocalDate> aprilWeekdays() {
        List<LocalDate> days = new ArrayList<>();
        for (LocalDate d = PERIOD_START; !d.isAfter(PERIOD_END); d = d.plusDays(1)) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) {
                days.add(d);
            }
        }
        return days;
    }

    private Store createStore(String name, String businessNumber, TaxPolicyType taxPolicyType) {
        Store s = new Store(name, businessNumber, "02-000-0000", "카페", 12_000, 100);
        s = storeRepository.save(s);

        PayrollPolicy policy = new PayrollPolicy();
        policy.setStore(s);
        policy.setTaxPolicyType(taxPolicyType);
        policy.setNightWorkRate(1.5);
        policy.setOvertimeRate(1.5);
        policy.setRegularHoursPerDay(8.0);
        policy.setWeeklyAllowanceEnabled(true);
        policy.setNightWorkStartTime(LocalTime.of(22, 0));
        payrollPolicyRepository.save(policy);
        return s;
    }

    private User createUser(String email, String name) {
        return userRepository.save(new User(email, name));
    }

    private EmployeeStoreRelation createMonthlyEmployee(String email, LocalDate hireDate, Boolean insuranceEnrolled) {
        return createMonthlyEmployeeAt(store, email, hireDate, insuranceEnrolled);
    }

    private EmployeeStoreRelation createMonthlyEmployeeAt(Store targetStore, String email,
                                                          LocalDate hireDate, Boolean insuranceEnrolled) {
        User user = createUser(email, "월급직원-" + email);
        EmployeeProfile employee = employeeProfileRepository.save(new EmployeeProfile(user));
        EmployeeStoreRelation relation = new EmployeeStoreRelation(employee, targetStore);
        relation.setEmploymentType(EmploymentType.MONTHLY_SALARY);
        relation.setMonthlySalary(MONTHLY_SALARY);
        relation.setContractedWeeklyDays(5);
        relation.setHireDate(hireDate);
        relation.setSocialInsuranceEnrolled(insuranceEnrolled);
        return employeeStoreRelationRepository.save(relation);
    }

    private void createAttendance(EmployeeStoreRelation relation, LocalDateTime checkIn, LocalDateTime checkOut) {
        Attendance attendance = new Attendance(relation.getEmployeeProfile(), relation.getStore());
        attendance.manualCheckIn(checkIn, 37.5665, 126.9780, relation.getStore().getStoreStandardHourWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }

    private void createConfirmedShift(EmployeeStoreRelation relation, LocalDate date,
                                      LocalTime start, LocalTime end) {
        WorkShift shift = WorkShift.create(
                relation.getEmployeeProfile().getId(), relation.getStore().getId(), date, start, end, null);
        shift.confirm();
        workShiftRepository.save(shift);
    }
}
