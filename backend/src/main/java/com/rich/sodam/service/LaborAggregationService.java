package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.core.payroll.severance.SeveranceCalculator;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.EmployeeAnnualLeaveDto;
import com.rich.sodam.dto.response.EmployeeSeveranceDto;
import com.rich.sodam.dto.response.StoreLaborSummaryDto;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * 인건비·연차·퇴직금 집계뷰. 기존 급여/출퇴근 데이터 위에서 읽기 전용 파생 지표를 만든다.
 * (수익화 확정안 §9: 퇴직금·연차·인건비비율 집계뷰 — PRO 대시보드 가치)
 *
 * 모든 산식은 SRP 계산기({@link AnnualLeaveEntitlementResolver}, {@link SeveranceCalculator})에 위임하고
 * 여기서는 데이터 수집·추정 입력만 담당한다. 결과는 입력 기준 <b>추정치</b>다.
 */
@Service
@RequiredArgsConstructor
public class LaborAggregationService {

    /** 1일 소정근로시간(평균임금 폴백 추정용). */
    private static final int STANDARD_DAILY_HOURS = 8;
    /** 평균임금 산정에 사용할 최근 급여 건수(법: 최근 3개월). */
    private static final int RECENT_PAYROLL_WINDOW = 3;

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final PayrollRepository payrollRepository;
    private final AnnualLeaveEntitlementResolver annualLeaveEntitlementResolver;
    private final SeveranceCalculator severanceCalculator;

    /**
     * 매장 인건비 집계. {@code monthlyRevenue} 제공 시 인건비비율(인건비/매출)도 산출.
     */
    @Transactional(readOnly = true)
    public StoreLaborSummaryDto storeLaborSummary(Long storeId, YearMonth month, Long monthlyRevenue) {
        Store store = store(storeId);
        List<EmployeeStoreRelation> active = relationRepository.findByStoreAndIsActiveTrue(store);

        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        long totalLaborCost = payrollRepository.findByStoreIdAndPeriod(storeId, from, to).stream()
                .mapToLong(p -> p.getGrossWage() == null ? 0L : p.getGrossWage())
                .sum();

        int averageHourlyWage = active.isEmpty() ? 0
                : (int) Math.round(active.stream()
                        .mapToInt(EmployeeStoreRelation::getAppliedHourlyWage)
                        .average().orElse(0));

        Double ratio = (monthlyRevenue != null && monthlyRevenue > 0)
                ? (double) totalLaborCost / monthlyRevenue
                : null;

        return new StoreLaborSummaryDto(
                storeId, month.toString(), active.size(), totalLaborCost, averageHourlyWage, ratio);
    }

    /**
     * 매장 활성 직원별 연차 집계(추정, 출근율 100% 가정). 5인 미만이면 연차 미적용(0일).
     */
    @Transactional(readOnly = true)
    public List<EmployeeAnnualLeaveDto> annualLeaveSummary(Long storeId) {
        Store store = store(storeId);
        List<EmployeeStoreRelation> active = relationRepository.findByStoreAndIsActiveTrue(store);
        boolean fiveOrMore = active.size() >= LaborStandards.SMALL_BUSINESS_THRESHOLD;
        LocalDate today = LocalDate.now();

        return active.stream().map(r -> {
            LocalDate hire = r.getHireDate() == null ? today : r.getHireDate();
            long tenureDays = ChronoUnit.DAYS.between(hire, today);
            // 발생일수 산정은 AnnualLeaveEntitlementResolver(공통 산식)에 위임 —
            // §18③(주 15시간 미만 제외)·기간제 정확히 1년 계약 예외 포함. MyLeaveBalanceService 와 동일 산식.
            int entitled = annualLeaveEntitlementResolver.entitledDays(r, today, fiveOrMore);

            return new EmployeeAnnualLeaveDto(
                    r.getEmployeeProfile().getId(),
                    employeeName(r),
                    hire, tenureDays, entitled, fiveOrMore);
        }).toList();
    }

    /**
     * 매장 활성 직원별 퇴직금 추정. 평균임금은 최근 급여(없으면 시급×8h)로 추정.
     */
    @Transactional(readOnly = true)
    public List<EmployeeSeveranceDto> severanceEstimates(Long storeId) {
        Store store = store(storeId);
        List<EmployeeStoreRelation> active = relationRepository.findByStoreAndIsActiveTrue(store);
        LocalDate today = LocalDate.now();

        return active.stream().map(r -> {
            LocalDate hire = r.getHireDate() == null ? today : r.getHireDate();
            long tenureDays = ChronoUnit.DAYS.between(hire, today);
            long avgDailyWage = estimateAverageDailyWage(r);
            boolean eligible = severanceCalculator.isEligible(tenureDays);
            long estimate = severanceCalculator.estimate(avgDailyWage, tenureDays);

            return new EmployeeSeveranceDto(
                    r.getEmployeeProfile().getId(),
                    employeeName(r),
                    hire, tenureDays, eligible, avgDailyWage, estimate);
        }).toList();
    }

    /** 최근 3개월 급여 임금총액 ÷ 일수. 급여 이력이 없으면 시급×8h 폴백. */
    private long estimateAverageDailyWage(EmployeeStoreRelation r) {
        long fallback = (long) r.getAppliedHourlyWage() * STANDARD_DAILY_HOURS;
        List<Payroll> recent = payrollRepository
                .findByEmployee_IdOrderByEndDateDesc(r.getEmployeeProfile().getId())
                .stream().limit(RECENT_PAYROLL_WINDOW).toList();
        if (recent.isEmpty()) {
            return fallback;
        }
        long totalGross = recent.stream()
                .mapToLong(p -> p.getGrossWage() == null ? 0L : p.getGrossWage()).sum();
        long totalDays = recent.stream()
                .mapToLong(p -> (p.getStartDate() != null && p.getEndDate() != null)
                        ? ChronoUnit.DAYS.between(p.getStartDate(), p.getEndDate()) + 1 : 30L)
                .sum();
        if (totalGross <= 0 || totalDays <= 0) {
            return fallback;
        }
        return Math.round((double) totalGross / totalDays);
    }

    private String employeeName(EmployeeStoreRelation r) {
        return r.getEmployeeProfile().getUser() != null
                ? r.getEmployeeProfile().getUser().getName() : null;
    }

    private Store store(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));
    }
}
