package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.repository.LaborContractRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
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
        c.setContractedHoursPerWeek(40.0);
        c.setWeeklyHolidayDay("SUNDAY");
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
    @DisplayName("휴일 누락 시 거부")
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
}
