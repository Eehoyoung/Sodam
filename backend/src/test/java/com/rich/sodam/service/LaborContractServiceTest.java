package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.EmploymentTypeChangeLog;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ContractPeriodType;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LaborContractServiceTest {

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
        Store store = new Store("소담매장", "1234567890", "02-1234-5678", "카페", 10_320, 100);
        store.applyEmployeeCount(5);
        lenient().when(storeRepository.findById(2L)).thenReturn(Optional.of(store));
    }

    private LaborContract valid() {
        LaborContract c = new LaborContract();
        c.setEmployeeId(1L);
        c.setStoreId(2L);
        c.setHourlyWage(10_320);
        c.setWagePaymentMethod(WagePaymentMethod.BANK_TRANSFER);
        c.setWageComponents("기본급(시급) + 주휴수당, 연장/야간/휴일 1.5배 가산");
        c.setContractedHoursPerWeek(40.0);
        c.setWorkStartTime(LocalTime.of(9, 0));
        c.setWorkEndTime(LocalTime.of(18, 0));
        c.setBreakMinutes(60);
        c.setWeeklyHolidayDay("SUNDAY");
        c.setAnnualLeaveNote("근로기준법 §60에 따라 1년간 80% 이상 출근 시 15일 부여");
        c.setWorkLocation("소담매장 서울점");
        c.setJobDescription("홀 서빙");
        return c;
    }

    @Test
    @DisplayName("§17 필수기재 충족 시 저장")
    void savesWhenValid() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThatCode(() -> service.save(valid())).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("임금 누락 시 거부")
    void rejectsMissingWage() {
        LaborContract c = valid();
        c.setHourlyWage(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("주 15시간 이상인데 휴일 누락 시 거부")
    void rejectsMissingHoliday() {
        LaborContract c = valid();
        c.setWeeklyHolidayDay(" ");
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("취업장소·업무 누락 시 거부")
    void rejectsMissingLocationOrJob() {
        LaborContract c = valid();
        c.setJobDescription(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("임금 지급방법 누락 시 거부")
    void rejectsMissingPaymentMethod() {
        LaborContract c = valid();
        c.setWagePaymentMethod(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("임금 구성항목 누락 시 거부")
    void rejectsMissingWageComponents() {
        LaborContract c = valid();
        c.setWageComponents(" ");
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("시업·종업 시각 누락 시 거부")
    void rejectsMissingWorkTimes() {
        LaborContract c = valid();
        c.setWorkEndTime(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("연차유급휴가 안내 누락 시 거부")
    void rejectsMissingAnnualLeaveNote() {
        LaborContract c = valid();
        c.setAnnualLeaveNote(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("기간제인데 종료일 누락 시 거부")
    void rejectsFixedTermWithoutEndDate() {
        LaborContract c = valid();
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setEndDate(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수습 적용인데 수습기간 누락 시 거부")
    void rejectsProbationWithoutMonths() {
        LaborContract c = valid();
        c.setProbation(true);
        c.setProbationMonths(null);
        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("주 15시간 미만이면 주휴일 미입력이어도 저장되고, 입력해도 강제로 비운다")
    void holidayAndAnnualLeaveForcedNullUnder15Hours() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setContractedHoursPerWeek(14.0);
        c.setWeeklyHolidayDay("SUNDAY"); // 사장이 실수로 선택해도
        c.setAnnualLeaveNote("연차유급휴가 안내"); // 주 15시간 미만은 §60 미적용

        LaborContract saved = service.save(c);

        assertThat(saved.getWeeklyHolidayDay()).isNull();
        assertThat(saved.getAnnualLeaveNote()).isNull();
    }

    @Test
    @DisplayName("주 15시간 미만이면 연차 안내가 없어도 저장된다")
    void annualLeaveNotRequiredUnder15Hours() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setContractedHoursPerWeek(14.0);
        c.setWeeklyHolidayDay(null);
        c.setAnnualLeaveNote(null);

        assertThatCode(() -> service.save(c)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("5인 미만 사업장은 주 15시간 이상이어도 연차 안내를 강제로 비운다")
    void annualLeaveForcedNullForUnderFiveEmployees() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        Store store = new Store("소담매장", "1234567890", "02-1234-5678", "카페", 10_320, 100);
        store.applyEmployeeCount(4);
        when(storeRepository.findById(2L)).thenReturn(Optional.of(store));
        LaborContract c = valid();

        LaborContract saved = service.save(c);

        assertThat(saved.getWeeklyHolidayDay()).isEqualTo("SUNDAY");
        assertThat(saved.getAnnualLeaveNote()).isNull();
    }

    @Test
    @DisplayName("월급제 계약은 월 기본급에서 통상시급과 고정수당을 정규화해 저장한다")
    void normalizesSalaryContractTerms() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setPayType(LaborContractPayType.SALARY);
        c.setSalaryPayUnit(SalaryPayUnit.MONTHLY);
        c.setHourlyWage(null);
        // 2024년 계약(최저 9,860원) — 통상시급 10,000원의 라운드 넘버 시나리오 유지 목적.
        // startDate 미지정이면 당해(2026, 최저 10,320원) 기준이라 최저임금 검증에 걸린다.
        c.setStartDate(LocalDate.of(2024, 1, 1));
        c.setMonthlyBaseSalary(2_090_000);
        c.setFixedOvertimeHoursPerMonth(10.0);
        c.setFixedNightHoursPerMonth(10.0);
        c.setFixedHolidayHoursWithin8PerMonth(8.0);
        c.setFixedHolidayHoursOver8PerMonth(0.0);

        LaborContract saved = service.save(c);

        assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(10_000);
        assertThat(saved.getHourlyWage()).isEqualTo(10_000);
        assertThat(saved.getAnnualSalary()).isEqualTo(25_080_000);
        assertThat(saved.getFixedOvertimePay()).isEqualTo(150_000);
        assertThat(saved.getFixedNightPay()).isEqualTo(50_000);
        assertThat(saved.getFixedHolidayPay()).isEqualTo(120_000);
        assertThat(saved.getExpectedMonthlyWage()).isEqualTo(2_410_000);
        assertThat(saved.getFiveOrMoreEmployeesSnapshot()).isTrue();
    }

    @Test
    @DisplayName("주 15시간 이상 경계값은 주휴 적용 대상")
    void weeklyAllowanceEligibleAtBoundary() {
        assertThat(LaborContractService.isWeeklyAllowanceEligible(15.0)).isTrue();
        assertThat(LaborContractService.isWeeklyAllowanceEligible(14.9)).isFalse();
        assertThat(LaborContractService.isWeeklyAllowanceEligible(null)).isFalse();
    }

    @Test
    @DisplayName("수습 최저임금 90% 감액은 1년 이상 기간제·비단순노무·3개월 이내이면 허용")
    void probationReductionAllowedForOneYearFixedTermNonSimpleLabor() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setEndDate(LocalDate.of(2026, 12, 31));
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatCode(() -> service.save(c)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("1년 미만 기간제는 수습 최저임금 감액을 거부")
    void rejectsProbationReductionForFixedTermUnderOneYear() {
        LaborContract c = valid();
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setEndDate(LocalDate.of(2026, 12, 30));
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("단순노무업무는 수습 최저임금 감액을 거부")
    void rejectsProbationReductionForSimpleLabor() {
        LaborContract c = valid();
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(true);

        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수습 3개월 초과분은 최저임금 감액을 거부")
    void rejectsProbationReductionOverThreeMonths() {
        LaborContract c = valid();
        c.setProbation(true);
        c.setProbationMonths(4);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수습 최저임금 감액은 90% 미만으로 설정할 수 없다")
    void rejectsProbationReductionUnderNinetyPercent() {
        LaborContract c = valid();
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.89);
        c.setSimpleLabor(false);

        assertThatThrownBy(() -> service.save(c)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("수습기간은 두되 최저임금을 감액하지 않으면 1년 미만 기간제도 저장된다")
    void allowsFullMinimumWageProbationForShortFixedTerm() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setEndDate(LocalDate.of(2026, 6, 30));
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(1.0);
        c.setSimpleLabor(true);

        assertThatCode(() -> service.save(c)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("산재보험은 입력값과 무관하게 항상 적용된다")
    void industrialAccidentInsuranceAlwaysApplied() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setIndustrialAccidentInsurance(false);

        LaborContract saved = service.save(c);

        assertThat(saved.isIndustrialAccidentInsurance()).isTrue();
    }

    @Test
    @DisplayName("고용보험은 1개월 이상 계약 + 주 15시간 이상이면 자동 적용된다")
    void employmentInsuranceAutoAppliedWhenEligible() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setEmploymentInsurance(false);
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 7, 1));
        c.setEndDate(LocalDate.of(2026, 7, 31));
        c.setContractedHoursPerWeek(15.0);

        LaborContract saved = service.save(c);

        assertThat(saved.isEmploymentInsurance()).isTrue();
    }

    @Test
    @DisplayName("고용보험은 주 15시간 미만이면 자동 제외된다")
    void employmentInsuranceExcludedUnder15Hours() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setEmploymentInsurance(true);
        c.setContractedHoursPerWeek(14.0);

        LaborContract saved = service.save(c);

        assertThat(saved.isEmploymentInsurance()).isFalse();
    }

    @Test
    @DisplayName("건강보험은 월 소정근로시간 60시간 미만이면 직장가입 자동 제외된다")
    void healthInsuranceExcludedUnder60MonthlyHours() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setHealthInsurance(true);
        c.setContractedHoursPerWeek(13.0);

        LaborContract saved = service.save(c);

        assertThat(saved.isHealthInsurance()).isFalse();
    }

    @Test
    @DisplayName("국민연금은 18세 이상 60세 미만 + 기준소득월액 하한 이상이면 자동 적용된다")
    void nationalPensionAutoAppliedWhenAgeAndIncomeEligible() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        User employee = new User("employee@example.com", "직원");
        employee.setBirthDate(LocalDate.of(1996, 1, 1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));

        LaborContract c = valid();
        c.setNationalPension(false);
        c.setStartDate(LocalDate.of(2026, 7, 4));
        c.setContractedHoursPerWeek(10.0);
        c.setHourlyWage(10_320);

        LaborContract saved = service.save(c);

        assertThat(saved.isNationalPension()).isTrue();
    }

    @Test
    @DisplayName("국민연금은 60세 이상이면 자동 제외된다")
    void nationalPensionExcludedAt60OrOlder() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        User employee = new User("employee@example.com", "직원");
        employee.setBirthDate(LocalDate.of(1960, 1, 1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));

        LaborContract c = valid();
        c.setNationalPension(true);
        c.setStartDate(LocalDate.of(2026, 7, 4));

        LaborContract saved = service.save(c);

        assertThat(saved.isNationalPension()).isFalse();
    }

    // ── 수정 1: 계약 저장 → 직원-매장 관계 급여 설정(고용형태) 동기화 ─────────────

    private EmployeeStoreRelation hourlyRelation() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.setId(77L);
        when(employeeStoreRelationRepository.findRelation(1L, 2L)).thenReturn(Optional.of(relation));
        return relation;
    }

    private LaborContract validSalary(int monthlyBase) {
        LaborContract c = valid();
        c.setPayType(LaborContractPayType.SALARY);
        c.setSalaryPayUnit(SalaryPayUnit.MONTHLY);
        c.setHourlyWage(null);
        c.setMonthlyBaseSalary(monthlyBase);
        return c;
    }

    @Test
    @DisplayName("SALARY 계약 저장 → 관계가 월급제로 전환되고 전환 이력에 작성 사장이 기록된다")
    void salaryContractSwitchesRelationToMonthly() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        EmployeeStoreRelation relation = hourlyRelation();

        service.save(validSalary(3_000_000), 99L);

        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(relation.getMonthlySalary()).isEqualTo(3_000_000);
        verify(employeeStoreRelationRepository).save(relation);

        ArgumentCaptor<EmploymentTypeChangeLog> captor = ArgumentCaptor.forClass(EmploymentTypeChangeLog.class);
        verify(employmentTypeChangeLogRepository).save(captor.capture());
        assertThat(captor.getValue().getRelationId()).isEqualTo(77L);
        assertThat(captor.getValue().getFromType()).isEqualTo(EmploymentType.HOURLY);
        assertThat(captor.getValue().getToType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(captor.getValue().getMonthlySalary()).isEqualTo(3_000_000);
        assertThat(captor.getValue().getChangedBy()).isEqualTo(99L);
    }

    @Test
    @DisplayName("연봉제 계약은 /12 정규화된 월 환산액이 관계 월급으로 전파된다")
    void annualSalaryContractPropagatesMonthlyEquivalent() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        EmployeeStoreRelation relation = hourlyRelation();
        LaborContract c = valid();
        c.setPayType(LaborContractPayType.SALARY);
        c.setSalaryPayUnit(SalaryPayUnit.ANNUAL);
        c.setHourlyWage(null);
        c.setAnnualSalary(36_000_000);

        service.save(c, 99L);

        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(relation.getMonthlySalary()).isEqualTo(3_000_000); // 36,000,000 / 12
    }

    @Test
    @DisplayName("HOURLY 재계약 저장 → 월급제였던 관계가 시급제로 역전환(월급 null)되고 이력이 남는다")
    void hourlyContractRevertsMonthlyRelation() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        EmployeeStoreRelation relation = hourlyRelation();
        relation.applyEmploymentType(EmploymentType.MONTHLY_SALARY, 3_000_000);

        service.save(valid(), 99L);

        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.HOURLY);
        assertThat(relation.getMonthlySalary()).isNull();

        ArgumentCaptor<EmploymentTypeChangeLog> captor = ArgumentCaptor.forClass(EmploymentTypeChangeLog.class);
        verify(employmentTypeChangeLogRepository).save(captor.capture());
        assertThat(captor.getValue().getFromType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        assertThat(captor.getValue().getToType()).isEqualTo(EmploymentType.HOURLY);
        assertThat(captor.getValue().getMonthlySalary()).isNull();
    }

    @Test
    @DisplayName("동일 형태·동일 월급 재저장 → 전환 이력을 기록하지 않는다")
    void sameStateResaveDoesNotLog() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        EmployeeStoreRelation relation = hourlyRelation();
        relation.applyEmploymentType(EmploymentType.MONTHLY_SALARY, 3_000_000);

        service.save(validSalary(3_000_000), 99L);

        assertThat(relation.getEmploymentType()).isEqualTo(EmploymentType.MONTHLY_SALARY);
        verify(employmentTypeChangeLogRepository, never()).save(any());
        verify(employeeStoreRelationRepository).save(relation); // 소정근로시간 등 나머지 전파는 수행
    }

    @Test
    @DisplayName("직원-매장 관계가 없으면(퇴사 등) 계약서만 저장하고 전파는 건너뛴다")
    void missingRelationSkipsPropagation() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(employeeStoreRelationRepository.findRelation(1L, 2L)).thenReturn(Optional.empty());

        assertThatCode(() -> service.save(validSalary(3_000_000), 99L)).doesNotThrowAnyException();
        verify(employmentTypeChangeLogRepository, never()).save(any());
    }

    // ── 수정 2: 주 소정근로시간 전파 → 계약서 통상시급 == 정산 통상시급 ──────────

    @Test
    @DisplayName("주 20h 월급제 계약 저장 → 관계에 주 소정근로시간이 전파되고 정산 통상시급(104h)이 계약서와 일치한다")
    void weeklyHoursPropagatedAndOrdinaryWageConsistent() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        EmployeeStoreRelation relation = hourlyRelation();
        LaborContract c = validSalary(1_200_000);
        c.setContractedHoursPerWeek(20.0); // 일 4h × 주 5일 단시간 월급제

        LaborContract saved = service.save(c, 99L);

        // 계약서: 1,200,000 ÷ 104h(= (20+주휴4)×4.345238) = 11,538원
        assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(11_538);
        assertThat(relation.getContractedWeeklyHours()).isEqualTo(20.0);
        // 정산(PayrollService 경로)이 쓰는 계산기 결과와 반드시 일치 — 분모 불일치(209h) 회귀 방지
        assertThat(new com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator()
                .ordinaryHourlyWage(1_200_000, relation.getContractedWeeklyHours(),
                        relation.getContractedWeeklyDays(), 8.0))
                .isEqualTo(saved.getOrdinaryHourlyWage());
    }

    // ── 수정 3: 계약 저장 경로 최저임금 검증 ─────────────────────────────────

    @Test
    @DisplayName("최저임금 미달 월급 계약은 거부된다 — 메시지에 환산 통상시급·최저시급 명시")
    void rejectsSalaryContractBelowMinimumWage() {
        // 2,000,000 ÷ 209h = 9,569원 < 2026년 최저 10,320원
        LaborContract c = validSalary(2_000_000);
        c.setStartDate(LocalDate.of(2026, 1, 1));

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("9,569")
                .hasMessageContaining("10,320");
    }

    @Test
    @DisplayName("주40 월급제는 2026년 법정 월 최저 기본급 2,156,880원부터 저장된다")
    void allowsSalaryAtMinimumMonthlyBase() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = validSalary(2_156_880);
        c.setStartDate(LocalDate.of(2026, 1, 1));

        LaborContract saved = service.save(c);

        assertThat(saved.getMonthlyBaseSalary()).isEqualTo(2_156_880);
        assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(10_320);
        assertThat(saved.getExpectedMonthlyWage()).isEqualTo(2_156_880);
    }

    @Test
    @DisplayName("월 기본급이 법정 월 최저액보다 1원 부족하면 반올림 통상시급이 10,320원이어도 거부된다")
    void rejectsSalaryOneWonBelowMinimumMonthlyBase() {
        LaborContract c = validSalary(2_156_879);
        c.setStartDate(LocalDate.of(2026, 1, 1));

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2,156,879")
                .hasMessageContaining("10,320")
                .hasMessageContaining("2,156,880");
    }

    @Test
    @DisplayName("5인 이상 월급제는 연장 1.5배·야간 0.5배·휴일 1.5/2.0배 법정 가산수당을 더한다")
    void calculatesPremiumPayForFiveOrMoreSalaryContract() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = validSalary(2_156_880);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setFixedOvertimeHoursPerMonth(10.0);
        c.setFixedNightHoursPerMonth(8.0);
        c.setFixedHolidayHoursWithin8PerMonth(4.0);
        c.setFixedHolidayHoursOver8PerMonth(2.0);

        LaborContract saved = service.save(c);

        assertThat(saved.getFixedOvertimePay()).isEqualTo(154_800);
        assertThat(saved.getFixedNightPay()).isEqualTo(41_280);
        assertThat(saved.getFixedHolidayPay()).isEqualTo(103_200);
        assertThat(saved.getExpectedMonthlyWage()).isEqualTo(2_456_160);
    }

    @Test
    @DisplayName("5인 미만 월급제는 연장 기본임금만 더하고 야간·휴일 가산분은 적용하지 않는다")
    void calculatesNonPremiumPayForUnderFiveSalaryContract() {
        Store store = new Store("소담매장", "1234567890", "02-1234-5678", "카페", 10_320, 100);
        store.applyEmployeeCount(4);
        when(storeRepository.findById(2L)).thenReturn(Optional.of(store));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = validSalary(2_156_880);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setFixedOvertimeHoursPerMonth(10.0);
        c.setFixedNightHoursPerMonth(8.0);
        c.setFixedHolidayHoursWithin8PerMonth(4.0);
        c.setFixedHolidayHoursOver8PerMonth(2.0);

        LaborContract saved = service.save(c);

        assertThat(saved.getFixedOvertimePay()).isEqualTo(103_200);
        assertThat(saved.getFixedNightPay()).isZero();
        assertThat(saved.getFixedHolidayPay()).isEqualTo(61_920);
        assertThat(saved.getExpectedMonthlyWage()).isEqualTo(2_322_000);
    }

    @Test
    @DisplayName("월급제 5,000개 조합은 법정 월 최저액 이상만 저장되고 미달은 거부된다")
    void validatesSalaryMinimumWageLegalityAcrossFiveThousandCases() {
        Store underFiveStore = new Store("소담매장2", "2234567890", "02-2222-2222", "카페", 10_320, 100);
        underFiveStore.applyEmployeeCount(4);
        when(storeRepository.findById(3L)).thenReturn(Optional.of(underFiveStore));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        int legalCases = 0;
        int illegalCases = 0;
        for (int caseNo = 0; caseNo < 5_000; caseNo++) {
            double contractedHoursPerWeek = 1 + ((caseNo * 7) % 520) / 10.0;
            int monthlyStandardHours = com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator
                    .monthlyStandardHoursForWeeklyHours(contractedHoursPerWeek);
            boolean probationReduced = caseNo % 5 == 0;
            double wageRate = probationReduced ? 0.9 : 1.0;
            int requiredMonthlyBaseSalary = (int) Math.ceil(10_320 * wageRate * monthlyStandardHours);
            boolean shouldSave = caseNo % 4 != 0;
            int monthlyBaseSalary = shouldSave
                    ? requiredMonthlyBaseSalary + ((caseNo * 31) % 300_000)
                    : Math.max(1, requiredMonthlyBaseSalary - 1 - ((caseNo * 17) % 5_000));
            boolean fiveOrMoreEmployees = caseNo % 2 == 0;
            double fixedOvertimeHours = (caseNo * 3) % 40;
            double fixedNightHours = (caseNo * 5) % 30;
            double fixedHolidayWithin8Hours = caseNo % 9;
            double fixedHolidayOver8Hours = caseNo % 4;

            LaborContract c = validSalary(monthlyBaseSalary);
            c.setStoreId(fiveOrMoreEmployees ? 2L : 3L);
            c.setStartDate(LocalDate.of(2026, 1, 1));
            c.setContractedHoursPerWeek(contractedHoursPerWeek);
            c.setFixedOvertimeHoursPerMonth(fixedOvertimeHours);
            c.setFixedNightHoursPerMonth(fixedNightHours);
            c.setFixedHolidayHoursWithin8PerMonth(fixedHolidayWithin8Hours);
            c.setFixedHolidayHoursOver8PerMonth(fixedHolidayOver8Hours);
            if (probationReduced) {
                c.setPeriodType(ContractPeriodType.FIXED_TERM);
                c.setEndDate(LocalDate.of(2026, 12, 31));
                c.setProbation(true);
                c.setProbationMonths(3);
                c.setProbationWageRate(0.9);
                c.setSimpleLabor(false);
            }

            if (shouldSave) {
                legalCases++;
                LaborContract saved = service.save(c);
                int ordinaryHourlyWage = (int) Math.round((double) monthlyBaseSalary / monthlyStandardHours);
                int expectedOvertimePay = (int) Math.round(ordinaryHourlyWage * fixedOvertimeHours
                        * (fiveOrMoreEmployees ? 1.5 : 1.0));
                int expectedNightPay = (int) Math.round(ordinaryHourlyWage * fixedNightHours
                        * (fiveOrMoreEmployees ? 0.5 : 0.0));
                int expectedHolidayPay = (int) Math.round(ordinaryHourlyWage
                        * (fixedHolidayWithin8Hours * (fiveOrMoreEmployees ? 1.5 : 1.0)
                        + fixedHolidayOver8Hours * (fiveOrMoreEmployees ? 2.0 : 1.0)));

                assertThat(saved.getMonthlyBaseSalary()).isEqualTo(monthlyBaseSalary);
                assertThat(saved.getOrdinaryHourlyWage()).isEqualTo(ordinaryHourlyWage);
                assertThat(saved.getFixedOvertimePay()).isEqualTo(expectedOvertimePay);
                assertThat(saved.getFixedNightPay()).isEqualTo(expectedNightPay);
                assertThat(saved.getFixedHolidayPay()).isEqualTo(expectedHolidayPay);
                assertThat(saved.getExpectedMonthlyWage()).isEqualTo(
                        monthlyBaseSalary + expectedOvertimePay + expectedNightPay + expectedHolidayPay);
            } else {
                illegalCases++;
                assertThatThrownBy(() -> service.save(c))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("최저임금");
            }
        }

        assertThat(legalCases).isGreaterThan(0);
        assertThat(illegalCases).isGreaterThan(0);
        assertThat(legalCases + illegalCases).isEqualTo(5_000);
    }

    @Test
    @DisplayName("수습 감액 요건 충족 시 월 기본급은 최저임금 90% 월 하한까지 허용된다")
    void allowsSalaryDownToProbationFloor() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        // 월 기본급 2,000,000원 — 일반 월 하한(2,156,880) 미달이지만 수습 월 하한(1,941,192) 이상
        LaborContract c = validSalary(2_000_000);
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setEndDate(LocalDate.of(2026, 12, 31));
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatCode(() -> service.save(c)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("수습 감액을 적용해도 90% 월 하한 미만 월급은 거부된다")
    void rejectsSalaryBelowProbationFloor() {
        // 1,900,000원 < 1,941,192원(2026 최저임금 90% × 209h)
        LaborContract c = validSalary(1_900_000);
        c.setPeriodType(ContractPeriodType.FIXED_TERM);
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setEndDate(LocalDate.of(2026, 12, 31));
        c.setProbation(true);
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1,941,192");
    }

    @Test
    @DisplayName("최저임금 미달 시급 계약도 동일하게 거부된다 (일관성)")
    void rejectsHourlyContractBelowMinimumWage() {
        LaborContract c = valid();
        c.setHourlyWage(10_000); // < 2026년 최저 10,320
        c.setStartDate(LocalDate.of(2026, 1, 1));

        assertThatThrownBy(() -> service.save(c))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("10,000")
                .hasMessageContaining("10,320");
    }

    @Test
    @DisplayName("시급 계약도 수습 감액 요건 충족 시 90% 하한까지 허용된다")
    void allowsHourlyDownToProbationFloor() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setHourlyWage(10_000); // ≥ 9,288(수습 하한)
        c.setStartDate(LocalDate.of(2026, 1, 1));
        c.setProbation(true); // 기간 미정(PERMANENT 취급) → 1년 이상 요건 충족
        c.setProbationMonths(3);
        c.setProbationWageRate(0.9);
        c.setSimpleLabor(false);

        assertThatCode(() -> service.save(c)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("발송 전(sentAt=null) 계약은 서명이 거부된다 — create()만 되고 send()가 안/못 된 초안 보호")
    void sign_beforeSent_throws() {
        LaborContract c = valid();
        when(repository.findById(10L)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.sign(10L, 1L, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("발송");

        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("발송된(markSent) 계약은 서명이 허용된다")
    void sign_afterSent_succeeds() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.markSent(java.time.LocalDateTime.now());
        when(repository.findById(10L)).thenReturn(Optional.of(c));

        LaborContract signed = service.sign(10L, 1L, null);

        assertThat(signed.isSigned()).isTrue();
    }

    @Test
    @DisplayName("markSent는 재호출해도 최초 발송 시각을 보존한다(멱등)")
    void markSent_isIdempotent() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        when(repository.findById(10L)).thenReturn(Optional.of(c));

        LaborContract first = service.markSent(10L);
        var firstSentAt = first.getSentAt();
        LaborContract second = service.markSent(10L);

        assertThat(second.getSentAt()).isEqualTo(firstSentAt);
    }
}
