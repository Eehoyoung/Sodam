package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.repository.LaborContractRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LaborContractServiceTest {

    @Mock
    LaborContractRepository repository;
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
    void weeklyHolidayForcedNullUnder15Hours() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LaborContract c = valid();
        c.setContractedHoursPerWeek(14.0);
        c.setWeeklyHolidayDay("SUNDAY"); // 사장이 실수로 선택해도

        LaborContract saved = service.save(c);

        assertThat(saved.getWeeklyHolidayDay()).isNull();
    }

    @Test
    @DisplayName("주 15시간 이상 경계값은 주휴 적용 대상")
    void weeklyAllowanceEligibleAtBoundary() {
        assertThat(LaborContractService.isWeeklyAllowanceEligible(15.0)).isTrue();
        assertThat(LaborContractService.isWeeklyAllowanceEligible(14.9)).isFalse();
        assertThat(LaborContractService.isWeeklyAllowanceEligible(null)).isFalse();
    }
}
