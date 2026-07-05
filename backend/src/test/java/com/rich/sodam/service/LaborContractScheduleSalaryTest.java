package com.rich.sodam.service;

import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.domain.type.SalaryPayUnit;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.EmploymentTypeChangeLogRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * 스케줄 기반 월급 자동 산출 수용 기준(A~E) 고정 테스트.
 *
 * <p>공통 조건: 기준시급 10,320원(2026 최저), 일 11h 실근로(11:00~23:00, 휴게 14:00~15:00),
 * 일 야간 1h(22~23시). 주 단위 집계 → 월 환산 계수 365/7/12.</p>
 */
@ExtendWith(MockitoExtension.class)
class LaborContractScheduleSalaryTest {

    private static final int BASE_WAGE = 10_320;

    @Mock
    LaborContractRepository repository;
    @Mock
    EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    StoreRepository storeRepository;
    @Mock
    PayrollPolicyRepository payrollPolicyRepository;
    @Mock
    EmploymentTypeChangeLogRepository employmentTypeChangeLogRepository;
    @InjectMocks
    LaborContractService service;

    @BeforeEach
    void setUp() {
        stubStoreWithEmployeeCount(4); // 기본: 5인 미만(가산 미적용) — 수용 기준 A·B 조건
        lenient().when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void stubStoreWithEmployeeCount(int count) {
        Store store = new Store("소담매장", "1234567890", "02-1234-5678", "카페", BASE_WAGE, 100);
        store.applyEmployeeCount(count);
        lenient().when(storeRepository.findById(2L)).thenReturn(Optional.of(store));
    }

    private static WorkScheduleDay eleven(DayOfWeek d) {
        // 11:00~23:00, 휴게 14:00~15:00 → 실근로 11h, 야간(22~23시) 1h
        return new WorkScheduleDay(d, LocalTime.of(11, 0), LocalTime.of(23, 0),
                LocalTime.of(14, 0), LocalTime.of(15, 0));
    }

    /** 월급제 + 스케줄 모드 공통 골격. 월급 직접 입력값은 일부러 채우지 않는다(서버 산출). */
    private LaborContract scheduleContract(List<WorkScheduleDay> schedule) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(1L);
        c.setStoreId(2L);
        c.setPayType(LaborContractPayType.SALARY);
        c.setWorkSchedule(schedule);
        c.setSalaryBaseHourlyWage(BASE_WAGE);
        c.setStartDate(LocalDate.of(2026, 7, 1));
        c.setWagePaymentMethod(WagePaymentMethod.BANK_TRANSFER);
        c.setWeeklyHolidayDay("SUNDAY");
        c.setAnnualLeaveNote("근로기준법 §60에 따라 1년간 80% 이상 출근 시 15일 부여");
        c.setWorkLocation("소담매장 서울점");
        c.setJobDescription("홀 서빙");
        return c;
    }

    private static List<WorkScheduleDay> fiveDays() {
        return List.of(eleven(DayOfWeek.MONDAY), eleven(DayOfWeek.WEDNESDAY), eleven(DayOfWeek.THURSDAY),
                eleven(DayOfWeek.FRIDAY), eleven(DayOfWeek.SUNDAY));
    }

    private static List<WorkScheduleDay> sixDays() {
        return List.of(eleven(DayOfWeek.MONDAY), eleven(DayOfWeek.TUESDAY), eleven(DayOfWeek.WEDNESDAY),
                eleven(DayOfWeek.THURSDAY), eleven(DayOfWeek.FRIDAY), eleven(DayOfWeek.SATURDAY));
    }

    @Test
    @DisplayName("케이스 A — 주 5일·일 11h(5인 미만): 소정 40h·연장 15h → 월급 2,829,523 / 연봉 33,954,276")
    void caseA_fiveDaysUnderFiveEmployees() {
        LaborContract saved = service.save(scheduleContract(fiveDays()));

        assertThat(saved.getContractedHoursPerWeek()).isEqualTo(40.0); // 주 소정 = min(55, 40)
        assertThat(saved.getContractedWeeklyDays()).isEqualTo(5);
        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_156_880);       // 10,320 × 209h
        assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(BASE_WAGE);      // 환산 통상시급 == 기준시급
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isCloseTo(65.18, within(0.01)); // 15h × 4.345238
        assertThat(saved.getFixedOvertimePay()).isCloseTo(672_643, within(1));            // 1.0배(5인 미만)
        assertThat(saved.getFixedNightHoursPerMonth()).isCloseTo(21.73, within(0.01));    // 5h × 4.345238
        assertThat(saved.getFixedNightPay()).isZero();                                    // 5인 미만 야간가산 0
        assertThat(saved.getExpectedMonthlyWage()).isEqualTo(2_829_523);
        assertThat(saved.getAnnualSalary()).isEqualTo(33_954_276); // 예상 월급 × 12
        assertThat(saved.getSalaryPayUnit()).isEqualTo(SalaryPayUnit.MONTHLY);
    }

    @Test
    @DisplayName("케이스 B — 주 6일·일 11h(5인 미만): 연장 26h(주 기준) → 월급 3,322,794 / 연봉 39,873,528")
    void caseB_sixDaysUnderFiveEmployees() {
        LaborContract saved = service.save(scheduleContract(sixDays()));

        assertThat(saved.getContractedHoursPerWeek()).isEqualTo(40.0);
        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_156_880);
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isCloseTo(112.98, within(0.01)); // 26h × 4.345238
        assertThat(saved.getFixedOvertimePay()).isCloseTo(1_165_914, within(1));
        assertThat(saved.getExpectedMonthlyWage()).isCloseTo(3_322_794, within(1));
        assertThat(saved.getAnnualSalary()).isCloseTo(39_873_528, within(12)); // (월 ±1) × 12
    }

    @Test
    @DisplayName("케이스 C — 같은 스케줄 5인 이상: 연장 1.5배·야간 0.5배 가산 적용")
    void caseC_premiumRatesForFiveOrMoreEmployees() {
        stubStoreWithEmployeeCount(5);

        LaborContract saved = service.save(scheduleContract(fiveDays()));

        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_156_880);
        // 10,320 × 65.178571h × 1.5 = 1,008,964
        assertThat(saved.getFixedOvertimePay()).isCloseTo(1_008_964, within(1));
        // 10,320 × 21.726190h × 0.5 = 112,107
        assertThat(saved.getFixedNightPay()).isCloseTo(112_107, within(1));
        assertThat(saved.getExpectedMonthlyWage()).isCloseTo(3_277_951, within(2));
        assertThat(saved.getAnnualSalary()).isEqualTo(saved.getExpectedMonthlyWage() * 12);
    }

    @Test
    @DisplayName("케이스 D — 요일별 상이(월수목금 17~22시·토일 11~23시 휴게 1h): 야간 교집합 주 2h 정확 산출")
    void caseD_perDayScheduleNightIntersection() {
        List<WorkScheduleDay> schedule = List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), null, null),
                new WorkScheduleDay(DayOfWeek.WEDNESDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), null, null),
                new WorkScheduleDay(DayOfWeek.THURSDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), null, null),
                new WorkScheduleDay(DayOfWeek.FRIDAY, LocalTime.of(17, 0), LocalTime.of(22, 0), null, null),
                new WorkScheduleDay(DayOfWeek.SATURDAY, LocalTime.of(11, 0), LocalTime.of(23, 0),
                        LocalTime.of(15, 0), LocalTime.of(16, 0)),
                new WorkScheduleDay(DayOfWeek.SUNDAY, LocalTime.of(11, 0), LocalTime.of(23, 0),
                        LocalTime.of(15, 0), LocalTime.of(16, 0)));

        LaborContract saved = service.save(scheduleContract(schedule));

        // 주 실근로 4×5 + 2×11 = 42h → 소정 40h · 연장 max(2×3, 42−40) = 6h · 야간 2h(토일 22~23시)
        assertThat(saved.getContractedHoursPerWeek()).isEqualTo(40.0);
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isCloseTo(26.07, within(0.01));
        assertThat(saved.getFixedNightHoursPerMonth()).isCloseTo(8.69, within(0.01)); // 2h × 4.345238
        // 요일별 시간 컬럼은 스케줄에서 유도(월 5h·토 11h·화 없음)
        assertThat(saved.getMonHours()).isEqualTo(5.0);
        assertThat(saved.getSatHours()).isEqualTo(11.0);
        assertThat(saved.getTueHours()).isNull();
    }

    @Test
    @DisplayName("케이스 E — 자정 넘김(20:00~05:00, 휴게 00:00~01:00) 스케줄 저장: 야간 6h/일 반영")
    void caseE_overnightScheduleSaved() {
        List<WorkScheduleDay> schedule = List.of(
                new WorkScheduleDay(DayOfWeek.FRIDAY, LocalTime.of(20, 0), LocalTime.of(5, 0),
                        LocalTime.of(0, 0), LocalTime.of(1, 0)),
                new WorkScheduleDay(DayOfWeek.SATURDAY, LocalTime.of(20, 0), LocalTime.of(5, 0),
                        LocalTime.of(0, 0), LocalTime.of(1, 0)));

        LaborContract saved = service.save(scheduleContract(schedule));

        // 일 실근로 8h × 2일 = 16h — 연장 없음, 야간 6h × 2 = 12h/주
        assertThat(saved.getContractedHoursPerWeek()).isEqualTo(16.0);
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isEqualTo(0.0);
        assertThat(saved.getFixedNightHoursPerMonth()).isCloseTo(52.14, within(0.01)); // 12h × 4.345238
        assertThat(saved.getFriHours()).isEqualTo(8.0);
        // 5인 미만 → 야간가산 0이어도 약정시간은 §17 근거로 보존
        assertThat(saved.getFixedNightPay()).isZero();
    }

    // ── 산출 모드·검증 규칙 ─────────────────────────────────────────────

    @Test
    @DisplayName("스케줄 모드에서 기준시급 누락 시 거부")
    void rejectsScheduleModeWithoutBaseWage() {
        LaborContract c = scheduleContract(fiveDays());
        c.setSalaryBaseHourlyWage(null);

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("기준시급");
    }

    @Test
    @DisplayName("스케줄 모드 기준시급이 최저임금 미만이면 거부 — 통상시급 경로로 검증 유지")
    void rejectsScheduleModeBelowMinimumWage() {
        LaborContract c = scheduleContract(fiveDays());
        c.setSalaryBaseHourlyWage(10_000); // < 2026 최저 10,320

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("10,320");
    }

    @Test
    @DisplayName("스케줄 모드는 함께 보낸 월급 직접 입력값을 무시하고 산출값으로 덮어쓴다(서버 권위)")
    void scheduleModeOverridesDirectInputs() {
        LaborContract c = scheduleContract(fiveDays());
        c.setMonthlyBaseSalary(9_999_999);
        c.setAnnualSalary(1);
        c.setFixedOvertimeHoursPerMonth(999.0);

        LaborContract saved = service.save(c);

        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_156_880);
        assertThat(saved.getAnnualSalary()).isEqualTo(33_954_276);
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isCloseTo(65.18, within(0.01));
    }

    @Test
    @DisplayName("wageComponents 미입력 시 산출근거 자동 생성(§17①) — 5인 미만 가산 미적용 문구 포함")
    void autoGeneratesWageComponentsWhenBlank() {
        LaborContract saved = service.save(scheduleContract(fiveDays()));

        assertThat(saved.getWageComponents())
                .contains("스케줄 자동 산출")
                .contains("주 실근로 55.0h")
                .contains("주 소정 40.0h")
                .contains("주 연장 15.0h")
                .contains("기본급 2,156,880원")
                .contains("5인 미만");
        assertThat(saved.getWageComponents().length()).isLessThanOrEqualTo(1000);
    }

    @Test
    @DisplayName("사장이 wageComponents 를 직접 쓰면 자동 생성으로 덮어쓰지 않는다")
    void keepsOwnerProvidedWageComponents() {
        LaborContract c = scheduleContract(fiveDays());
        c.setWageComponents("기본급 + 고정연장수당 포함 포괄임금 — 상세 별첨");

        LaborContract saved = service.save(c);

        assertThat(saved.getWageComponents()).isEqualTo("기본급 + 고정연장수당 포함 포괄임금 — 상세 별첨");
    }

    @Test
    @DisplayName("§17 대표 시업·종업·휴게 미입력 시 첫 근무요일(월→일 순) 값으로 채운다")
    void fillsRepresentativeTimesFromFirstScheduledDay() {
        LaborContract saved = service.save(scheduleContract(fiveDays()));

        assertThat(saved.getWorkStartTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(saved.getWorkEndTime()).isEqualTo(LocalTime.of(23, 0));
        assertThat(saved.getBreakMinutes()).isEqualTo(60);
    }

    @Test
    @DisplayName("주휴 15h 경계 — 주 15h 스케줄은 주휴 포함(월 78h), 14.5h 는 주휴 0(월 63h)")
    void weeklyAllowanceBoundaryAtFifteenHours() {
        // 15.0h: 2일 × 7.5h
        LaborContract at15 = scheduleContract(List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(16, 30), null, null),
                new WorkScheduleDay(DayOfWeek.TUESDAY, LocalTime.of(9, 0), LocalTime.of(16, 30), null, null)));
        LaborContract saved15 = service.save(at15);
        // (15 + 3) × 4.345238 = 78.21 → 78h
        assertThat(saved15.getMonthlyBaseSalary()).isEqualTo(BASE_WAGE * 78);

        // 14.5h: 7h + 7.5h — §18③ 주휴 미적용, §55 주휴일도 강제 해제
        LaborContract under15 = scheduleContract(List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(16, 0), null, null),
                new WorkScheduleDay(DayOfWeek.TUESDAY, LocalTime.of(9, 0), LocalTime.of(16, 30), null, null)));
        LaborContract savedUnder = service.save(under15);
        // 14.5 × 4.345238 = 63.006 → 63h
        assertThat(savedUnder.getMonthlyBaseSalary()).isEqualTo(BASE_WAGE * 63);
        assertThat(savedUnder.getWeeklyHolidayDay()).isNull();
    }

    @Test
    @DisplayName("스케줄 모드 저장 → 직원-매장 관계에 월급제·월급·주 소정시간·소정일이 전파된다(정산 연동)")
    void propagatesDerivedTermsToRelation() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.setId(77L);
        when(employeeStoreRelationRepository.findRelation(1L, 2L)).thenReturn(Optional.of(relation));

        service.save(scheduleContract(fiveDays()), 99L);

        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(relation.getMonthlySalary()).isEqualTo(2_156_880);
        assertThat(relation.getContractedWeeklyHours()).isEqualTo(40.0);
        assertThat(relation.getContractedWeeklyDays()).isEqualTo(5);
    }

    @Test
    @DisplayName("HOURLY 계약은 스케줄·기준시급이 있어도 자동 산출이 발동하지 않는다 — 시급제 경로 완전 불변")
    void hourlyContractNeverTriggersScheduleDerivation() {
        LaborContract c = scheduleContract(fiveDays());
        c.setPayType(LaborContractPayType.HOURLY); // 진입점 payType 게이트 — SALARY 전용
        c.setHourlyWage(BASE_WAGE);
        c.setContractedHoursPerWeek(40.0);
        c.setWorkStartTime(LocalTime.of(11, 0));
        c.setWorkEndTime(LocalTime.of(23, 0));
        c.setBreakMinutes(60);
        c.setMonHours(4.0); // 사장이 직접 쓴 요일별 시간 — 시급제 시맨틱 그대로 보존돼야 함
        c.setWageComponents("기본급(시급) + 주휴수당(요건 충족 시), 연장/야간/휴일 가산");

        LaborContract saved = service.save(c);

        // 월급제 산출 필드는 전부 비어 있어야 한다(시급제는 주휴 별도 가산 — 209h 내재 규칙 미적용)
        assertThat(saved.getMonthlyBaseSalary()).isNull();
        assertThat(saved.getAnnualSalary()).isNull();
        assertThat(saved.getExpectedMonthlyWage()).isNull();
        assertThat(saved.getFixedOvertimeHoursPerMonth()).isNull();
        assertThat(saved.getFixedNightHoursPerMonth()).isNull();
        assertThat(saved.getSalaryBaseHourlyWage()).isNull(); // 기준시급은 스케줄 모드 전용 — 정리
        assertThat(saved.getHourlyWage()).isEqualTo(BASE_WAGE); // 시급이 단일 소스 그대로
        // 요일별 시간·소정시간·시업/종업도 사장 입력값 그대로 — 스케줄에서 유도하지 않는다
        assertThat(saved.getMonHours()).isEqualTo(4.0);
        assertThat(saved.getContractedHoursPerWeek()).isEqualTo(40.0);
        assertThat(saved.getWageComponents()).startsWith("기본급(시급)"); // 자동 생성 미발동
    }

    @Test
    @DisplayName("하위호환 — 스케줄 없는 월급 직접 입력 계약은 기존 규칙(연봉 = 월 기본급 × 12) 그대로")
    void directInputModeUnchanged() {
        LaborContract c = scheduleContract(null);
        c.setSalaryBaseHourlyWage(null);
        c.setSalaryPayUnit(SalaryPayUnit.MONTHLY);
        c.setMonthlyBaseSalary(2_500_000);
        c.setContractedHoursPerWeek(40.0);
        c.setWorkStartTime(LocalTime.of(9, 0));
        c.setWorkEndTime(LocalTime.of(18, 0));
        c.setBreakMinutes(60);
        c.setWageComponents("기본급 월 2,500,000원(주휴 포함)");

        LaborContract saved = service.save(c);

        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_500_000);
        assertThat(saved.getAnnualSalary()).isEqualTo(30_000_000); // 직접 입력 모드 기존 규칙 유지
        assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(Math.round(2_500_000 / 209.0));
    }
}
