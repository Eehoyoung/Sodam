package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.EmployeeAnnualLeaveDto;
import com.rich.sodam.dto.response.EmployeeSeveranceDto;
import com.rich.sodam.dto.response.StoreLaborSummaryDto;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 노무 집계뷰 통합 테스트 (인건비·연차·퇴직금).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborAggregationServiceTest {

    @Autowired private LaborAggregationService laborAggregationService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private PayrollRepository payrollRepository;

    private Store store() {
        Store s = new Store("집계테스트매장", "1112223334", "02-111-2222", "카페", 12_000, 100);
        return storeRepository.save(s);
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        EmployeeProfile p = new EmployeeProfile(u);
        return employeeProfileRepository.save(p);
    }

    private EmployeeStoreRelation relation(EmployeeProfile emp, Store store, int wage, LocalDate hire) {
        EmployeeStoreRelation r = new EmployeeStoreRelation(emp, store, wage);
        r.setHireDate(hire);
        r.setIsActive(true);
        return relationRepository.save(r);
    }

    @Test
    @DisplayName("인건비 집계: 활성직원·평균시급·확정인건비, 매출 제공 시 인건비비율")
    void laborSummary() {
        Store store = store();
        EmployeeProfile emp = employee("agg1@x.com", "집계직원");
        relation(emp, store, 15_000, LocalDate.now().minusMonths(6));

        // 이번 달 급여 1건(총액 1,200,000)
        Payroll payroll = new Payroll();
        payroll.setStore(store);
        payroll.setEmployee(emp);
        payroll.setStartDate(YearMonth.now().atDay(1));
        payroll.setEndDate(YearMonth.now().atEndOfMonth());
        payroll.setGrossWage(1_200_000);
        payrollRepository.save(payroll);

        StoreLaborSummaryDto summary =
                laborAggregationService.storeLaborSummary(store.getId(), YearMonth.now(), 6_000_000L);

        assertThat(summary.employeeCount()).isEqualTo(1);
        assertThat(summary.averageHourlyWage()).isEqualTo(15_000);
        assertThat(summary.totalLaborCost()).isEqualTo(1_200_000L);
        // 인건비비율 = 1,200,000 / 6,000,000 = 0.2
        assertThat(summary.laborCostRatio()).isEqualTo(0.2);
    }

    @Test
    @DisplayName("매출 미제공 시 인건비비율은 null")
    void ratioNullWhenNoRevenue() {
        Store store = store();
        relation(employee("agg2@x.com", "직원2"), store, 12_000, LocalDate.now().minusMonths(2));
        StoreLaborSummaryDto summary =
                laborAggregationService.storeLaborSummary(store.getId(), YearMonth.now(), null);
        assertThat(summary.laborCostRatio()).isNull();
    }

    @Test
    @DisplayName("연차 집계: 5인 이상이면 1년 이상 근로자 15일")
    void annualLeaveFiveOrMore() {
        Store store = store();
        // 5명 → 5인 이상 사업장. 1명은 1년 이상 근속(15일 발생).
        relation(employee("y1@x.com", "1년차"), store, 12_000, LocalDate.now().minusYears(1).minusDays(10));
        for (int i = 2; i <= 5; i++) {
            relation(employee("n" + i + "@x.com", "신입" + i), store, 12_000, LocalDate.now().minusMonths(3));
        }

        List<EmployeeAnnualLeaveDto> leaves = laborAggregationService.annualLeaveSummary(store.getId());
        assertThat(leaves).hasSize(5);
        assertThat(leaves).allMatch(EmployeeAnnualLeaveDto::fiveOrMore);
        EmployeeAnnualLeaveDto oneYear = leaves.stream()
                .filter(l -> l.tenureDays() >= 365).findFirst().orElseThrow();
        assertThat(oneYear.entitledDays()).isEqualTo(15);
    }

    @Test
    @DisplayName("연차 집계: 5인 미만이면 연차 미적용(0일)")
    void annualLeaveUnderFive() {
        Store store = store();
        relation(employee("solo@x.com", "혼자"), store, 12_000, LocalDate.now().minusYears(2));
        List<EmployeeAnnualLeaveDto> leaves = laborAggregationService.annualLeaveSummary(store.getId());
        assertThat(leaves).hasSize(1);
        assertThat(leaves.get(0).fiveOrMore()).isFalse();
        assertThat(leaves.get(0).entitledDays()).isZero();
    }

    @Test
    @DisplayName("퇴직금 추정: 1년 미만 미적용, 1년 이상 추정액 발생")
    void severanceEstimate() {
        Store store = store();
        relation(employee("sev_new@x.com", "신입"), store, 12_000, LocalDate.now().minusMonths(6));
        relation(employee("sev_old@x.com", "장기"), store, 15_000, LocalDate.now().minusYears(2));

        List<EmployeeSeveranceDto> list = laborAggregationService.severanceEstimates(store.getId());
        assertThat(list).hasSize(2);

        EmployeeSeveranceDto newbie = list.stream()
                .filter(s -> s.tenureDays() < 365).findFirst().orElseThrow();
        assertThat(newbie.eligible()).isFalse();
        assertThat(newbie.estimatedSeverance()).isZero();

        EmployeeSeveranceDto veteran = list.stream()
                .filter(s -> s.tenureDays() >= 365).findFirst().orElseThrow();
        assertThat(veteran.eligible()).isTrue();
        // 시급 15,000 × 8h = 120,000(1일 평균임금 폴백) → 양수 추정액
        assertThat(veteran.averageDailyWage()).isEqualTo(120_000L);
        assertThat(veteran.estimatedSeverance()).isPositive();
    }
}
