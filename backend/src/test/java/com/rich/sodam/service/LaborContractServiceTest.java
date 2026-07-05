package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    @InjectMocks
    LaborContractService service;

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
}
