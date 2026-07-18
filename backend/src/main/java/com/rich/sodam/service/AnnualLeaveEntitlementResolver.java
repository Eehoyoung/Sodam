package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.core.payroll.leave.AnnualLeaveCalculator;
import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 매장-직원 관계 기준 발생 연차일수 산정 — {@code MyLeaveBalanceService}와
 * {@code LaborAggregationService}가 복붙해 쓰던 산식을 일원화한다.
 *
 * <p>§18③(주 소정근로시간 15시간 미만 제외)과 대법원 2021다227100(기간제 정확히 1년 계약
 * 만료 시 15일 미적용) 예외를 모두 반영한다. 실제 산식은 순수 계산기({@link AnnualLeaveCalculator})에
 * 위임하고, 여기서는 엔티티에서 계산 입력값을 뽑아 전달하는 역할만 한다.</p>
 */
@Component
@RequiredArgsConstructor
public class AnnualLeaveEntitlementResolver {

    private final AnnualLeaveCalculator annualLeaveCalculator;
    private final LaborContractRepository laborContractRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;

    /** 해당 매장 활성 직원 수 기준 5인 이상 여부(연차 적용 대상, §11). */
    public boolean isFiveOrMoreEmployees(Store store) {
        return employeeStoreRelationRepository.countByStoreAndIsActiveTrue(store)
                >= LaborStandards.SMALL_BUSINESS_THRESHOLD;
    }

    /** 출근율 100%(추정) 가정 발생 연차일수. */
    public int entitledDays(EmployeeStoreRelation relation, LocalDate today, boolean fiveOrMore) {
        return entitledDays(relation, today, fiveOrMore, 1.0);
    }

    /**
     * 발생 연차일수 산정.
     *
     * @param relation      직원-매장 관계(입사일·주 소정근로시간·소정근로일 보유)
     * @param today         산정 기준일
     * @param fiveOrMore    5인 이상 사업장 여부(§11)
     * @param attendanceRate 해당 연도 출근율(0.0~1.0)
     */
    public int entitledDays(EmployeeStoreRelation relation, LocalDate today, boolean fiveOrMore, double attendanceRate) {
        double weeklyHours = weeklyHoursOf(relation);
        LocalDate hire = hireDateOf(relation, today);
        int completedYears = completedYears(hire, today);
        int monthsWorked = (int) ChronoUnit.MONTHS.between(hire, today);

        if (completedYears < 1) {
            return annualLeaveCalculator.firstYearMonthly(monthsWorked, fiveOrMore, weeklyHours);
        }
        boolean fixedTermException = isExactlyOneYearFixedTermExpiring(relation, completedYears);
        return annualLeaveCalculator.annualConsideringFixedTermException(
                completedYears, attendanceRate, fiveOrMore, weeklyHours, fixedTermException);
    }

    /**
     * 현재 연차 산정 주기(연차연도) 윈도우 — 입사일 기준 매 1년 단위.
     * 1년 미만 근속이면 [입사일, 입사일+1년), 그 이후는 완료 햇수만큼 이동한
     * [입사일+N년, 입사일+(N+1)년)이 "현재 주기"다.
     *
     * <p>발생 연차({@link #entitledDays})는 이 주기 동안 새로 발생하는 일수이므로, 휴가 사용량도
     * 전체 재직기간이 아니라 이 주기 안에서만 비교해야 발생-사용 대응이 맞는다.</p>
     */
    public LeaveYearWindow currentLeaveYearWindow(EmployeeStoreRelation relation, LocalDate today) {
        LocalDate hire = hireDateOf(relation, today);
        int completedYears = completedYears(hire, today);
        LocalDate start = completedYears < 1 ? hire : hire.plusYears(completedYears);
        return new LeaveYearWindow(start, start.plusYears(1));
    }

    /** 연차연도 윈도우(시작 포함, 종료 미포함). */
    public record LeaveYearWindow(LocalDate start, LocalDate end) {
        public boolean contains(LocalDate date) {
            return date != null && !date.isBefore(start) && date.isBefore(end);
        }
    }

    /** 계약상 1일 소정근로시간(주 소정근로시간 ÷ 소정근로일). 정보 없으면 null(계산기가 8시간 기본 적용). */
    public Double dailyContractedHoursOf(EmployeeStoreRelation relation) {
        Double weeklyHours = relation.getContractedWeeklyHours();
        Integer weeklyDays = relation.getContractedWeeklyDays();
        if (weeklyHours != null && weeklyDays != null && weeklyDays > 0) {
            return weeklyHours / weeklyDays;
        }
        return null;
    }

    /**
     * 근로계약서 스케줄에 등록된 근무 요일 집합 — 종일(FULL_DAY) 휴가의 소정근로일 판정에 사용.
     * 계약이 없거나 스케줄(요일별 근무시간) 등록이 없으면 null(호출측이 역일수로 폴백).
     */
    public Set<DayOfWeek> scheduledWorkDaysOf(EmployeeStoreRelation relation) {
        if (relation.getEmployeeProfile() == null || relation.getStore() == null) {
            return null;
        }
        return laborContractRepository
                .findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc(
                        relation.getEmployeeProfile().getId(), relation.getStore().getId())
                .map(LaborContract::getWorkSchedule)
                .filter(schedule -> schedule != null && !schedule.isEmpty())
                .map(schedule -> schedule.stream().map(WorkScheduleDay::day).collect(Collectors.toSet()))
                .orElse(null);
    }

    private LocalDate hireDateOf(EmployeeStoreRelation relation, LocalDate today) {
        return relation.getHireDate() == null ? today : relation.getHireDate();
    }

    private int completedYears(LocalDate hire, LocalDate today) {
        long tenureDays = ChronoUnit.DAYS.between(hire, today);
        return (int) (tenureDays / 365);
    }

    /**
     * 주 소정근로시간 산정: 관계에 설정된 값 → 소정근로일수 폴백 → 정보 없으면 배제하지 않음
     * (기존 동작 유지, 회귀 방지 — 계약 정보가 아직 없다고 무조건 미적용 처리하지 않는다).
     */
    private double weeklyHoursOf(EmployeeStoreRelation r) {
        if (r.getContractedWeeklyHours() != null) {
            return r.getContractedWeeklyHours();
        }
        if (r.getContractedWeeklyDays() != null) {
            return r.getContractedWeeklyDays() * LaborStandards.STATUTORY_DAILY_HOURS;
        }
        return LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue();
    }

    /** 기간제(FIXED_TERM) 계약이 정확히 1년이고 계속근로 1년째에 그 계약대로 종료(예정)인지. */
    private boolean isExactlyOneYearFixedTermExpiring(EmployeeStoreRelation r, int completedYears) {
        if (completedYears != 1 || r.getEmployeeProfile() == null || r.getStore() == null) {
            return false;
        }
        Optional<LaborContract> latest = laborContractRepository
                .findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc(
                        r.getEmployeeProfile().getId(), r.getStore().getId());
        return latest.filter(c -> c.getPeriodType() == ContractPeriodType.FIXED_TERM
                        && c.getStartDate() != null && c.getEndDate() != null
                        && c.getEndDate().isEqual(c.getStartDate().plusYears(1).minusDays(1)))
                .isPresent();
    }
}
