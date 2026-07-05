package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.constant.MinorLaborStandards;
import com.rich.sodam.core.payroll.constant.SocialInsuranceRates;
import com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator;
import com.rich.sodam.core.payroll.wage.WorkScheduleCalculator;
import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.EmploymentTypeChangeLog;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.domain.type.SalaryPayUnit;
import com.rich.sodam.dto.response.LaborContractContextResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.EmploymentTypeChangeLogRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.Optional;

/**
 * 근로계약서 관리 (근로기준법 §17). 저장 시 §17 필수 기재사항 누락을 차단하고,
 * 주 15시간 미만 근로자는 휴일·연차(§18③)를 자동으로 제외한다.
 */
@Service
@RequiredArgsConstructor
public class LaborContractService {

    private static final double FULL_MINIMUM_WAGE_RATE = 1.0;
    private static final double MIN_PROBATION_WAGE_RATE = 0.9;
    private static final int MAX_PROBATION_REDUCTION_MONTHS = 3;
    private static final double WEEKS_PER_MONTH = 52.0 / 12.0;
    private static final double HEALTH_INSURANCE_MONTHLY_HOURS_THRESHOLD = 60.0;
    private static final double EMPLOYMENT_INSURANCE_WEEKLY_HOURS_THRESHOLD = 15.0;
    private static final int NATIONAL_PENSION_MIN_AGE = 18;
    private static final int NATIONAL_PENSION_MAX_EXCLUSIVE_AGE = 60;

    private final LaborContractRepository laborContractRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PayrollPolicyRepository payrollPolicyRepository;
    private final EmploymentTypeChangeLogRepository employmentTypeChangeLogRepository;

    /**
     * 근로계약서를 저장한다(변경 수행자 미상 — 내부·테스트 경로).
     * API 경로는 {@link #save(LaborContract, Long)} 로 작성 주체를 함께 넘길 것.
     */
    @Transactional
    public LaborContract save(LaborContract contract) {
        return save(contract, null);
    }

    /**
     * 근로계약서를 저장한다. §17 필수 기재사항(임금 3요소·소정근로시간·휴일·연차·취업장소·업무) 누락 시 거부.
     *
     * <p>주 소정근로시간이 {@link LaborLawConstants#MIN_WEEKLY_HOURS_FOR_ALLOWANCE}(15시간) 미만이면
     * §18③ 에 따라 §55 휴일과 §60 연차유급휴가가 적용되지 않으므로, 입력값과 무관하게 저장 시 강제로 비운다.
     *
     * <p>임금(시급 또는 월급 환산 통상시급)이 최저임금(§6) 미만이면 저장을 거부한다 —
     * 수습 감액 요건 충족 시에만 최저임금의 90%까지 허용({@link #assertAtLeastMinimumWage}).
     *
     * <p>저장 성공 시 계약 조건(소정근로일·주 소정근로시간·임금형태/월급)을 직원-매장 관계에 전파해
     * 정산이 계약과 동일 기준으로 계산되게 한다({@link #propagateContractTermsToRelation}).
     * 전파 시점은 서명 완료가 아니라 <b>저장 시점</b> — 기존 소정근로일 전파 선례와 동일하며,
     * sign() 은 직원 동의 기록(markSigned)만 수행하는 별도 흐름이다.
     *
     * @param changedBy 계약 작성 주체(사장 userId). 고용형태 전환 이력의 수행자로 기록. null 허용(내부 경로).
     */
    @Transactional
    public LaborContract save(LaborContract contract, Long changedBy) {
        normalizeCompensation(contract);
        applyLaborLawExclusions(contract);
        normalizeProbation(contract);
        applySocialInsuranceEligibility(contract);
        assertRequiredFields(contract);
        assertAtLeastMinimumWage(contract);
        LaborContract saved = laborContractRepository.save(contract);
        propagateContractTermsToRelation(saved, changedBy);
        return saved;
    }

    /**
     * 주 15시간 미만 근로자는 §55 휴일과 §60 연차가 적용되지 않으므로 관련 값을 저장하지 않는다.
     * 사장이 실수로 요일을 선택해도 서비스 계층에서 안전하게 무효화한다.
     */
    private void applyLaborLawExclusions(LaborContract c) {
        if (!isWeeklyAllowanceEligible(c.getContractedHoursPerWeek())) {
            c.setWeeklyHolidayDay(null);
            c.setAnnualLeaveNote(null);
            return;
        }
        if (!isAnnualLeaveApplicable(c)) {
            c.setAnnualLeaveNote(null);
        }
    }

    /** 주 소정근로시간이 §55 휴일·§60 연차 적용 최소 기준(15시간) 이상인지. */
    public static boolean isWeeklyAllowanceEligible(Double contractedHoursPerWeek) {
        return contractedHoursPerWeek != null
                && contractedHoursPerWeek >= LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue();
    }

    private void normalizeCompensation(LaborContract c) {
        if (c.getPayType() == null) {
            c.setPayType(LaborContractPayType.HOURLY);
        }

        Store store = null;
        if (c.getStoreId() != null) {
            store = storeRepository.findById(c.getStoreId())
                    .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요."));
            c.setFiveOrMoreEmployeesSnapshot(store.isPremiumApplicable());
        }

        if (c.getPayType() == LaborContractPayType.HOURLY) {
            if (c.getWorkSchedule() != null && !c.getWorkSchedule().isEmpty()) {
                // 시급제는 스케줄로 급여를 산출하지 않지만(§17 기록용 보존) 구조 오류는 저장 전에 차단
                WorkScheduleCalculator.weeklyStats(c.getWorkSchedule());
            }
            clearSalaryTerms(c);
            return;
        }

        boolean premiumApplicable = store != null
                ? store.isPremiumApplicable()
                : !Boolean.FALSE.equals(c.getFiveOrMoreEmployeesSnapshot());

        // 스케줄 자동 산출 모드(스케줄 존재) — 주 실근로/소정/연장/야간을 산출해
        // 월급제 필드를 선(先)기입한 뒤 기존 정규화(통상시급·고정수당 금액)를 태운다.
        WorkScheduleCalculator.WeeklyStats stats = applyScheduleDerivedSalaryTerms(c);
        normalizeSalaryTerms(c, premiumApplicable);
        if (stats != null) {
            // 직접 입력 모드의 연봉(= 월 기본급 × 12)과 달리, 스케줄 모드 연봉은
            // 예상 월 지급액(기본급 + 고정연장 + 야간가산) × 12 — 자동 산출 사양.
            if (c.getExpectedMonthlyWage() != null) {
                c.setAnnualSalary(c.getExpectedMonthlyWage() * 12);
            }
            // §17① 임금 구성·계산방법 — 비어 있으면 산출근거를 자동 생성(사장 입력값은 존중).
            // 산출 실패(월 기준시간 0 등)로 예상 월급이 없으면 생성하지 않고 §17 검증이 거부하게 둔다.
            if (c.getExpectedMonthlyWage() != null && isBlank(c.getWageComponents())) {
                c.setWageComponents(buildScheduleWageComponents(c, stats, premiumApplicable));
            }
        }
    }

    /**
     * 스케줄 자동 산출 모드(월급제 + 요일별 스케줄 존재) — 스케줄을 단일 소스로
     * 주 단위 근로시간을 집계해 월급제 필드를 유도한다. 스케줄이 없으면 null(직접 입력 모드).
     *
     * <p>유도 대상: 주 소정근로시간(=min(실근로, 40h)) → {@code contractedHoursPerWeek},
     * 근무일 수 → {@code contractedWeeklyDays}(주휴 개근 판정 분모), 요일별 실근로 →
     * {@code monHours~sunHours}(기간제법 §17 근로일별 근로시간), 월 기본급 = 기준시급 ×
     * {@link MonthlySalaryCalculator#monthlyStandardHoursForWeeklyHours}(주 소정 — 주휴 포함,
     * 15h 미만 주휴 0 §18③), 월 고정 연장·야간 약정시간 = 주 시간 × 365/7/12.
     * 금액(통상시급·수당·예상 월급)은 이어지는 {@link #normalizeSalaryTerms} 가 계산 —
     * 월 기본급이 기준시급 × 월 기준시간의 정수곱이므로 환산 통상시급 == 기준시급이 보장되고,
     * 최저임금 검증({@link #assertAtLeastMinimumWage})도 기준시급에 그대로 적용된다.</p>
     *
     * <p>사장이 함께 보낸 월급·고정수당 직접 입력값은 무시하고 산출값으로 덮어쓴다(서버 권위).
     * §17 대표 시업·종업·휴게가 비어 있으면 첫 근무요일(월→일 순) 값으로 채운다 —
     * 요일별 상이 스케줄의 정확한 명시는 스케줄 JSON·요일별 시간 컬럼이 담당.</p>
     */
    private WorkScheduleCalculator.WeeklyStats applyScheduleDerivedSalaryTerms(LaborContract c) {
        List<WorkScheduleDay> schedule = c.getWorkSchedule();
        if (schedule == null || schedule.isEmpty()) {
            return null; // 기존 월급 직접 입력 모드 — 하위호환
        }
        if (c.getSalaryBaseHourlyWage() == null || c.getSalaryBaseHourlyWage() <= 0) {
            throw new IllegalArgumentException("스케줄 기반 월급 산출에는 급여 기준시급(원)이 필수입니다.");
        }

        WorkScheduleCalculator.WeeklyStats stats = WorkScheduleCalculator.weeklyStats(schedule);
        double contractedWeekly = stats.weeklyContractedHours();
        int standardHours = MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(contractedWeekly);

        c.setSalaryPayUnit(SalaryPayUnit.MONTHLY);
        c.setContractedHoursPerWeek(contractedWeekly);
        c.setContractedWeeklyDays(stats.workingDays());
        c.setMonthlyBaseSalary(c.getSalaryBaseHourlyWage() * standardHours);
        c.setAnnualSalary(null); // normalizeSalaryTerms → 이후 예상 월급 × 12 로 확정
        c.setFixedOvertimeHoursPerMonth(WorkScheduleCalculator.monthlyHours(stats.weeklyOvertimeHours()));
        c.setFixedNightHoursPerMonth(WorkScheduleCalculator.monthlyHours(stats.weeklyNightHours()));
        c.setFixedHolidayHoursWithin8PerMonth(0.0); // 휴일근로는 스케줄 산출 범위 밖 — 정산에서 실적 반영
        c.setFixedHolidayHoursOver8PerMonth(0.0);

        c.setMonHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.MONDAY));
        c.setTueHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.TUESDAY));
        c.setWedHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.WEDNESDAY));
        c.setThuHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.THURSDAY));
        c.setFriHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.FRIDAY));
        c.setSatHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.SATURDAY));
        c.setSunHours(stats.dailyWorkedHours().get(java.time.DayOfWeek.SUNDAY));

        WorkScheduleDay first = WorkScheduleCalculator.firstByDayOrder(schedule);
        if (c.getWorkStartTime() == null) {
            c.setWorkStartTime(first.startTime());
        }
        if (c.getWorkEndTime() == null) {
            c.setWorkEndTime(first.endTime());
        }
        if (c.getBreakMinutes() == null) {
            c.setBreakMinutes(WorkScheduleCalculator.breakMinutesOf(first));
        }
        return stats;
    }

    /**
     * §17① 임금 구성항목·계산방법 자동 생성(스케줄 모드, 사장 미입력 시).
     * 주 단위 집계 → 월 환산 근거와 항목별 금액, 5인 미만 가산 미적용 사유를 명시한다.
     */
    private static String buildScheduleWageComponents(
            LaborContract c, WorkScheduleCalculator.WeeklyStats stats, boolean premiumApplicable) {
        int standardHours = MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(stats.weeklyContractedHours());
        StringBuilder sb = new StringBuilder();
        sb.append(String.format(
                "[스케줄 자동 산출] 기준시급 %,d원 · 주 근무일 %d일 · 주 실근로 %.1fh · 주 소정 %.1fh(월 %dh, 주휴 포함)",
                c.getSalaryBaseHourlyWage(), stats.workingDays(),
                stats.weeklyActualHours(), stats.weeklyContractedHours(), standardHours));
        if (stats.weeklyOvertimeHours() > 0) {
            sb.append(String.format(" · 주 연장 %.1fh(월 %.2fh)",
                    stats.weeklyOvertimeHours(), c.getFixedOvertimeHoursPerMonth()));
        }
        if (stats.weeklyNightHours() > 0) {
            sb.append(String.format(" · 주 야간 %.1fh(월 %.2fh)",
                    stats.weeklyNightHours(), c.getFixedNightHoursPerMonth()));
        }
        sb.append(String.format(" — 기본급 %,d원", c.getMonthlyBaseSalary()));
        if (stats.weeklyOvertimeHours() > 0) {
            sb.append(String.format(" + 고정연장수당 %,d원(%.1f배)",
                    c.getFixedOvertimePay(), premiumApplicable ? 1.5 : 1.0));
        }
        if (stats.weeklyNightHours() > 0) {
            sb.append(String.format(" + 야간가산수당 %,d원", c.getFixedNightPay()));
        }
        sb.append(String.format(" = 월 %,d원 · 연 %,d원", c.getExpectedMonthlyWage(),
                c.getExpectedMonthlyWage() * 12));
        if (!premiumApplicable) {
            sb.append(" · 상시 5인 미만 사업장 — 근로기준법 §56 연장·야간 가산 미적용(연장 1.0배, 야간가산 0원)");
        }
        return sb.toString();
    }

    private void clearSalaryTerms(LaborContract c) {
        c.setSalaryPayUnit(null);
        c.setMonthlyBaseSalary(null);
        c.setAnnualSalary(null);
        c.setOrdinaryHourlyWage(null);
        c.setFixedOvertimeHoursPerMonth(null);
        c.setFixedOvertimePay(null);
        c.setFixedNightHoursPerMonth(null);
        c.setFixedNightPay(null);
        c.setFixedHolidayHoursWithin8PerMonth(null);
        c.setFixedHolidayHoursOver8PerMonth(null);
        c.setFixedHolidayPay(null);
        c.setExpectedMonthlyWage(null);
        // 기준시급은 스케줄 자동 산출(월급제) 전용 — 시급제는 hourlyWage 가 단일 소스.
        // workSchedule 자체는 §17 근로일·시각 기록으로서 payType 무관하게 보존한다.
        c.setSalaryBaseHourlyWage(null);
    }

    private void normalizeSalaryTerms(LaborContract c, boolean premiumApplicable) {
        if (c.getSalaryPayUnit() == null) {
            c.setSalaryPayUnit(c.getAnnualSalary() != null ? SalaryPayUnit.ANNUAL : SalaryPayUnit.MONTHLY);
        }

        Integer monthlyBase = c.getMonthlyBaseSalary();
        Integer annual = c.getAnnualSalary();
        if (c.getSalaryPayUnit() == SalaryPayUnit.ANNUAL && annual != null) {
            monthlyBase = roundWon(annual / 12.0);
        } else if (monthlyBase != null) {
            annual = monthlyBase * 12;
        } else if (annual != null) {
            monthlyBase = roundWon(annual / 12.0);
        }

        c.setMonthlyBaseSalary(monthlyBase);
        c.setAnnualSalary(annual);
        c.setFixedOvertimeHoursPerMonth(nz(c.getFixedOvertimeHoursPerMonth()));
        c.setFixedNightHoursPerMonth(nz(c.getFixedNightHoursPerMonth()));
        c.setFixedHolidayHoursWithin8PerMonth(nz(c.getFixedHolidayHoursWithin8PerMonth()));
        c.setFixedHolidayHoursOver8PerMonth(nz(c.getFixedHolidayHoursOver8PerMonth()));

        int standardHours = monthlyStandardHoursForSalary(c.getContractedHoursPerWeek());
        if (monthlyBase == null || standardHours <= 0) {
            return;
        }

        int ordinaryHourlyWage = roundWon((double) monthlyBase / standardHours);
        int overtimePay = roundWon(ordinaryHourlyWage * c.getFixedOvertimeHoursPerMonth()
                * (premiumApplicable ? 1.5 : 1.0));
        int nightPay = roundWon(ordinaryHourlyWage * c.getFixedNightHoursPerMonth()
                * (premiumApplicable ? 0.5 : 0.0));
        int holidayPay = roundWon(ordinaryHourlyWage
                * (c.getFixedHolidayHoursWithin8PerMonth() * (premiumApplicable ? 1.5 : 1.0)
                + c.getFixedHolidayHoursOver8PerMonth() * (premiumApplicable ? 2.0 : 1.0)));

        c.setOrdinaryHourlyWage(ordinaryHourlyWage);
        c.setHourlyWage(ordinaryHourlyWage);
        c.setFixedOvertimePay(overtimePay);
        c.setFixedNightPay(nightPay);
        c.setFixedHolidayPay(holidayPay);
        c.setExpectedMonthlyWage(monthlyBase + overtimePay + nightPay + holidayPay);
    }

    /**
     * 월급제 통상시급 분모(월 통상임금 산정 기준시간). 산식은
     * {@link MonthlySalaryCalculator#monthlyStandardHoursForWeeklyHours(double)} 에 위임 —
     * 정산(PayrollService)과 단일 소스를 공유해 계약서 통상시급과 명세서 통상시급의
     * 불일치(주 20h 계약이 정산에서 209h 분모로 절반 계산되던 버그)를 구조적으로 차단한다.
     */
    private static int monthlyStandardHoursForSalary(Double contractedHoursPerWeek) {
        if (contractedHoursPerWeek == null || contractedHoursPerWeek <= 0) {
            return 0;
        }
        return MonthlySalaryCalculator.monthlyStandardHoursForWeeklyHours(contractedHoursPerWeek);
    }

    private static double nz(Double value) {
        return value == null ? 0.0 : Math.max(0.0, value);
    }

    private static int roundWon(double value) {
        return (int) Math.round(value);
    }

    private void normalizeProbation(LaborContract c) {
        if (!c.isProbation()) {
            c.setProbationMonths(null);
            c.setProbationWageRate(null);
            return;
        }
        if (c.getProbationWageRate() == null) {
            c.setProbationWageRate(FULL_MINIMUM_WAGE_RATE);
        }
    }

    /**
     * 최저임금법 §5② 및 시행령 §3에 따른 수습 최저임금 감액 가능 여부.
     * 수습 자체가 아니라 "최저임금 미만(최저 90%) 지급" 가능 여부만 판단한다.
     */
    public static boolean isProbationWageReductionAllowed(LaborContract c) {
        return c != null
                && c.isProbation()
                && c.getProbationWageRate() != null
                && c.getProbationWageRate() < FULL_MINIMUM_WAGE_RATE
                && c.getProbationWageRate() >= MIN_PROBATION_WAGE_RATE
                && !c.isSimpleLabor()
                && c.getProbationMonths() != null
                && c.getProbationMonths() <= MAX_PROBATION_REDUCTION_MONTHS
                && isContractTermAtLeastOneYear(c.getPeriodType(), c.getStartDate(), c.getEndDate());
    }

    public static boolean isContractTermAtLeastOneYear(
            ContractPeriodType periodType,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (periodType == null || periodType == ContractPeriodType.PERMANENT) {
            return true;
        }
        if (startDate == null || endDate == null) {
            return false;
        }
        return !endDate.plusDays(1).isBefore(startDate.plusYears(1));
    }

    private void applySocialInsuranceEligibility(LaborContract c) {
        LocalDate referenceDate = c.getStartDate() != null ? c.getStartDate() : LocalDate.now();
        LocalDate employeeBirthDate = findEmployeeBirthDate(c.getEmployeeId());

        c.setIndustrialAccidentInsurance(true);
        c.setEmploymentInsurance(isEmploymentInsuranceRequired(c));
        c.setHealthInsurance(isHealthInsuranceWorkplaceEligible(c));
        if (employeeBirthDate != null) {
            c.setNationalPension(isNationalPensionRequired(c, employeeBirthDate, referenceDate));
        }
    }

    private LocalDate findEmployeeBirthDate(Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        Optional<User> user = userRepository.findById(employeeId);
        return user != null ? user.map(User::getBirthDate).orElse(null) : null;
    }

    public static boolean isEmploymentInsuranceRequired(LaborContract c) {
        return c != null
                && isContractTermAtLeastOneMonth(c.getPeriodType(), c.getStartDate(), c.getEndDate())
                && c.getContractedHoursPerWeek() != null
                && c.getContractedHoursPerWeek() >= EMPLOYMENT_INSURANCE_WEEKLY_HOURS_THRESHOLD;
    }

    public static boolean isHealthInsuranceWorkplaceEligible(LaborContract c) {
        return c != null
                && isContractTermAtLeastOneMonth(c.getPeriodType(), c.getStartDate(), c.getEndDate())
                && monthlyContractedHours(c) >= HEALTH_INSURANCE_MONTHLY_HOURS_THRESHOLD;
    }

    public static boolean isNationalPensionRequired(
            LaborContract c,
            LocalDate birthDate,
            LocalDate referenceDate
    ) {
        if (c == null || birthDate == null || referenceDate == null) {
            return false;
        }
        int age = Period.between(birthDate, referenceDate).getYears();
        return age >= NATIONAL_PENSION_MIN_AGE
                && age < NATIONAL_PENSION_MAX_EXCLUSIVE_AGE
                && estimatedMonthlyWage(c) >= SocialInsuranceRates.pensionBaseMin(referenceDate).doubleValue();
    }

    public static boolean isContractTermAtLeastOneMonth(
            ContractPeriodType periodType,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (periodType == null || periodType == ContractPeriodType.PERMANENT) {
            return true;
        }
        if (startDate == null || endDate == null) {
            return false;
        }
        return !endDate.plusDays(1).isBefore(startDate.plusMonths(1));
    }

    public static double monthlyContractedHours(LaborContract c) {
        if (c == null || c.getContractedHoursPerWeek() == null) {
            return 0.0;
        }
        return c.getContractedHoursPerWeek() * WEEKS_PER_MONTH;
    }

    public static double estimatedMonthlyWage(LaborContract c) {
        if (c != null && c.getPayType() == LaborContractPayType.SALARY && c.getExpectedMonthlyWage() != null) {
            return c.getExpectedMonthlyWage();
        }
        if (c == null || c.getHourlyWage() == null || c.getContractedHoursPerWeek() == null) {
            return 0.0;
        }
        double weeklyHours = c.getContractedHoursPerWeek();
        double paidWeeklyHours = weeklyHours + weeklyAllowanceHours(weeklyHours);
        return c.getHourlyWage() * paidWeeklyHours * WEEKS_PER_MONTH;
    }

    private static double weeklyAllowanceHours(double weeklyHours) {
        if (weeklyHours < LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue()) {
            return 0.0;
        }
        return Math.min(
                LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS.doubleValue(),
                weeklyHours / LaborLawConstants.STATUTORY_WEEKLY_HOURS.doubleValue()
                        * LaborLawConstants.STATUTORY_DAILY_HOURS.doubleValue()
        );
    }

    /**
     * 계약 조건을 직원-매장 관계(급여 설정)에 전파한다 — 계약서 따로, 정산 따로가 되지 않게.
     *
     * <ul>
     *   <li><b>소정근로일</b>: 주휴 개근 판정 분모(기존 동작). 값이 없으면 관계 기존 값 보존.</li>
     *   <li><b>주 소정근로시간</b>: 월급제 통상시급 분모 정교화(V37). 값이 없으면 기존 값 보존.</li>
     *   <li><b>임금형태·월급</b>: SALARY 계약 → MONTHLY_SALARY + 월 기본급(연봉제는 정규화된
     *       월 환산액), HOURLY 계약 → HOURLY + 월급 null. 실제 전환이 발생했을 때만
     *       {@link EmploymentTypeChangeLog} 기록(판정은 {@link EmployeeStoreRelation#applyEmploymentType}
     *       단일 소스 — WageEditSheet 경로와 중복·이중 기록 없음).</li>
     * </ul>
     *
     * <p>관계가 없으면(퇴사 등) 계약서만 저장하고 조용히 건너뛴다 — 기존 소정근로일 전파와 동일한 관용.</p>
     */
    private void propagateContractTermsToRelation(LaborContract contract, Long changedBy) {
        employeeStoreRelationRepository
                .findRelation(contract.getEmployeeId(), contract.getStoreId())
                .ifPresent((EmployeeStoreRelation relation) -> {
                    if (contract.getContractedWeeklyDays() != null) {
                        relation.setContractedWeeklyDays(contract.getContractedWeeklyDays());
                    }
                    if (contract.getContractedHoursPerWeek() != null) {
                        relation.setContractedWeeklyHours(contract.getContractedHoursPerWeek());
                    }

                    boolean salaryContract = contract.getPayType() == LaborContractPayType.SALARY;
                    EmploymentType fromType = relation.getEmploymentType();
                    EmploymentType toType = salaryContract ? EmploymentType.MONTHLY_SALARY : EmploymentType.HOURLY;
                    // SALARY 는 normalizeSalaryTerms 가 월 기본급을 보장(연봉제도 /12 정규화 완료)
                    Integer toSalary = salaryContract ? contract.getMonthlyBaseSalary() : null;

                    boolean changed = relation.applyEmploymentType(toType, toSalary);
                    if (changed) {
                        employmentTypeChangeLogRepository.save(EmploymentTypeChangeLog.of(
                                relation.getId(), fromType, toType, toSalary, changedBy));
                    }
                    employeeStoreRelationRepository.save(relation);
                });
    }

    /**
     * 임금이 최저임금(최저임금법 §6) 이상인지 저장 시점에 검증한다.
     *
     * <p>미달 계약은 §28 형사처벌 대상이고 사법상으로도 미달 부분이 무효(§6③ — 최저임금액으로
     * 자동 대체)이므로 체결 자체를 차단한다. WageEditSheet 경로(StoreManagementServiceImpl 의
     * WAGE_BELOW_MINIMUM)와 동일 정책 — 계약서 저장 경로만 검증이 없던 갭을 메운다.
     * 시급제·월급제(환산 통상시급) 모두 동일 적용(일관성).</p>
     *
     * <p>기준 연도는 계약 시작일 연도(미입력 시 당해 연도 — {@link MinimumWage#hourlyFor} 는
     * 미등록 연도를 최신 고시값으로 폴백). 수습 감액 요건(§5②·시행령 §3: 1년 이상 계약·수습
     * 3개월 이내·비단순노무·감액률 90% 이상)을 충족하면 최저임금 × probationWageRate 까지 허용
     * — 판정은 {@link #isProbationWageReductionAllowed} 재사용.</p>
     */
    private void assertAtLeastMinimumWage(LaborContract c) {
        boolean salaryContract = c.getPayType() == LaborContractPayType.SALARY;
        Integer effectiveHourly = salaryContract ? c.getOrdinaryHourlyWage() : c.getHourlyWage();
        if (effectiveHourly == null) {
            return; // 존재 여부는 assertRequiredFields 가 이미 차단
        }
        int year = (c.getStartDate() != null ? c.getStartDate() : LocalDate.now()).getYear();
        BigDecimal minimum = MinimumWage.hourlyFor(year);
        boolean probationReduced = isProbationWageReductionAllowed(c);
        BigDecimal floor = probationReduced
                ? minimum.multiply(BigDecimal.valueOf(c.getProbationWageRate())).setScale(0, RoundingMode.HALF_UP)
                : minimum;
        if (BigDecimal.valueOf(effectiveHourly).compareTo(floor) < 0) {
            String wageLabel = salaryContract
                    ? String.format("월 기본급 환산 통상시급 %,d원", effectiveHourly)
                    : String.format("시급 %,d원", effectiveHourly);
            String floorLabel = probationReduced
                    ? String.format("%d년 최저임금 %,d원의 수습 감액 하한 %,d원", year, minimum.intValue(), floor.intValue())
                    : String.format("%d년 최저임금 %,d원", year, minimum.intValue());
            throw new IllegalArgumentException(String.format(
                    "%s이(가) %s 미만입니다. 최저임금 미달 계약은 저장할 수 없습니다(최저임금법 §6).",
                    wageLabel, floorLabel));
        }
    }

    @Transactional(readOnly = true)
    public List<LaborContract> findFor(Long employeeId, Long storeId) {
        return laborContractRepository.findByEmployeeIdAndStoreIdOrderByCreatedAtDesc(employeeId, storeId);
    }

    /**
     * 직원 본인의 모든 근로계약서를 최신순으로 조회한다.
     */
    @Transactional(readOnly = true)
    public List<LaborContract> findByEmployee(Long employeeId) {
        return laborContractRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public LaborContract findById(Long contractId) {
        return laborContractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("근로계약서를 찾을 수 없어요."));
    }

    /**
     * 직원 본인이 근로계약서에 서명(동의)한다.
     *
     * <p>본인 계약이 아니면 {@link AccessDeniedException}. 이미 서명된 경우 멱등하게
     * 기존 계약을 그대로 반환한다(최초 서명 시각 보존).
     *
     * @param contractId     서명 대상 계약 id
     * @param employeeId     서명 주체(principal) — 계약의 employeeId 와 일치해야 함
     * @param signatureImage 서명 이미지(base64, 선택 — null 이면 동의 버튼 방식)
     */
    @Transactional
    public LaborContract sign(Long contractId, Long employeeId, String signatureImage) {
        LaborContract contract = findById(contractId);
        if (!contract.getEmployeeId().equals(employeeId)) {
            throw new AccessDeniedException("본인 근로계약서만 서명할 수 있어요.");
        }
        // markSigned 는 멱등 — 이미 서명돼 있으면 시각 보존하고 false 반환
        contract.markSigned(LocalDateTime.now(), signatureImage);
        return laborContractRepository.save(contract);
    }

    /**
     * 근로계약서 작성 화면에 채워줄 보조정보(당사자 정보·법정 기준값)를 조회한다.
     * 값을 계약서 행에 복제 저장하지 않고 매번 원본에서 조회한다(PII 이중 저장 방지).
     */
    @Transactional(readOnly = true)
    public LaborContractContextResponse buildContext(Long storeId, Long employeeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요."));
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("직원을 찾을 수 없어요."));
        PayrollPolicy policy = payrollPolicyRepository.findByStore_Id(storeId).orElse(null);

        int year = LocalDate.now().getYear();
        boolean minor = isMinor(employee.getBirthDate());

        double nightRate = policy != null ? policy.getNightWorkRate() : 1.5;
        double overtimeRate = policy != null ? policy.getOvertimeRate() : 1.5;

        String suggestedWageComponents = String.format(
                "기본급(시급) + 주휴수당(요건 충족 시) · 연장근로 %.1f배 가산 · 야간근로(22시~06시) %.1f배 가산 · 휴일근로 %.1f배 가산",
                overtimeRate, nightRate, overtimeRate);
        int employeeCount = Math.toIntExact(employeeStoreRelationRepository.countByStoreAndIsActiveTrue(store));
        boolean fiveOrMoreEmployees = store.isPremiumApplicable();

        return new LaborContractContextResponse(
                store.getStoreName(),
                store.getBusinessNumber(),
                store.getStorePhoneNumber(),
                store.getFullAddress(),
                employee.getName(),
                employee.getPhone(),
                employee.getBirthDate(),
                minor,
                year,
                MinimumWage.hourlyFor(year).intValue(),
                nightRate,
                overtimeRate,
                LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue(),
                fiveOrMoreEmployees,
                employeeCount,
                suggestedWageComponents
        );
    }

    /** 만 18세 미만(연소근로자, §66·§69·§70) 여부. 생년월일 미상이면 과대 경고 방지를 위해 false. */
    private boolean isMinor(LocalDate birthDate) {
        if (birthDate == null) {
            return false;
        }
        return Period.between(birthDate, LocalDate.now()).getYears() < MinorLaborStandards.MINOR_AGE_THRESHOLD;
    }

    private void assertRequiredFields(LaborContract c) {
        if (c.getEmployeeId() == null || c.getStoreId() == null) {
            throw new IllegalArgumentException("직원·매장 정보는 필수입니다.");
        }
        if (c.getPayType() == LaborContractPayType.SALARY) {
            validateSalaryRequired(c);
        } else if (c.getHourlyWage() == null || c.getHourlyWage() <= 0) {
            throw new IllegalArgumentException("임금(시급)은 필수 기재사항입니다(§17).");
        }
        if (c.getWagePaymentMethod() == null) {
            throw new IllegalArgumentException("임금 지급방법(계좌이체/현금)은 필수 기재사항입니다(§17①).");
        }
        if (isBlank(c.getWageComponents())) {
            throw new IllegalArgumentException("임금 구성항목·계산방법은 필수 기재사항입니다(§17①).");
        }
        if (c.getContractedHoursPerWeek() == null) {
            throw new IllegalArgumentException("소정근로시간은 필수 기재사항입니다(§17).");
        }
        if (c.getWorkStartTime() == null || c.getWorkEndTime() == null) {
            throw new IllegalArgumentException("시업·종업 시각은 필수 기재사항입니다(§17).");
        }
        if (isWeeklyAllowanceEligible(c.getContractedHoursPerWeek()) && isBlank(c.getWeeklyHolidayDay())) {
            throw new IllegalArgumentException("주 15시간 이상 근로자는 휴일(주휴일)이 필수 기재사항입니다(§17·§55).");
        }
        if (isAnnualLeaveApplicable(c) && isBlank(c.getAnnualLeaveNote())) {
            throw new IllegalArgumentException("연차유급휴가 안내는 필수 기재사항입니다(§17·§60).");
        }
        if (isBlank(c.getWorkLocation()) || isBlank(c.getJobDescription())) {
            throw new IllegalArgumentException("취업 장소·종사 업무는 필수 기재사항입니다(§17).");
        }
        if (c.getPeriodType() != null && c.getPeriodType().name().equals("FIXED_TERM") && c.getEndDate() == null) {
            throw new IllegalArgumentException("기간제 계약은 종료일이 필수입니다(§17).");
        }
        if (c.getStartDate() != null && c.getEndDate() != null && c.getEndDate().isBefore(c.getStartDate())) {
            throw new IllegalArgumentException("계약 종료일은 시작일보다 빠를 수 없습니다.");
        }
        if (c.isProbation()) {
            validateProbation(c);
        }
    }

    private void validateSalaryRequired(LaborContract c) {
        if (c.getSalaryPayUnit() == null) {
            throw new IllegalArgumentException("월급/연봉제 계약은 급여 입력 단위가 필수입니다.");
        }
        if (c.getMonthlyBaseSalary() == null || c.getMonthlyBaseSalary() <= 0) {
            throw new IllegalArgumentException("월급/연봉제 계약은 월 기본급 또는 연봉 월 환산액이 필수입니다.");
        }
        if (c.getAnnualSalary() == null || c.getAnnualSalary() <= 0) {
            throw new IllegalArgumentException("월급/연봉제 계약은 연봉 금액 또는 월급 연 환산액이 필수입니다.");
        }
        if (c.getOrdinaryHourlyWage() == null || c.getOrdinaryHourlyWage() <= 0) {
            throw new IllegalArgumentException("월급/연봉제 계약은 통상시급 산정값이 필수입니다.");
        }
        if (c.getExpectedMonthlyWage() == null || c.getExpectedMonthlyWage() <= 0) {
            throw new IllegalArgumentException("월급/연봉제 계약은 예상 월 지급액 산정값이 필수입니다.");
        }
    }

    private void validateProbation(LaborContract c) {
        if (c.getProbationMonths() == null || c.getProbationMonths() <= 0) {
            throw new IllegalArgumentException("수습을 적용하면 수습기간(개월)이 필수입니다.");
        }
        if (c.getProbationWageRate() == null
                || c.getProbationWageRate() <= 0
                || c.getProbationWageRate() > FULL_MINIMUM_WAGE_RATE) {
            throw new IllegalArgumentException("수습 중 임금 비율은 0보다 크고 1 이하이어야 합니다.");
        }
        if (c.getProbationWageRate() < MIN_PROBATION_WAGE_RATE) {
            throw new IllegalArgumentException("수습 중 최저임금 감액은 90% 미만으로 설정할 수 없습니다(최저임금법 시행령 §3).");
        }
        if (c.getProbationWageRate() >= FULL_MINIMUM_WAGE_RATE) {
            return;
        }
        if (c.isSimpleLabor()) {
            throw new IllegalArgumentException("단순노무업무 근로자는 수습 중에도 최저임금을 감액할 수 없습니다(최저임금법 §5② 단서).");
        }
        if (c.getProbationMonths() > MAX_PROBATION_REDUCTION_MONTHS) {
            throw new IllegalArgumentException("최저임금 감액은 수습 시작 후 3개월 이내에만 가능합니다(최저임금법 §5②).");
        }
        if (!isContractTermAtLeastOneYear(c.getPeriodType(), c.getStartDate(), c.getEndDate())) {
            throw new IllegalArgumentException("최저임금 감액은 1년 이상 근로계약에서만 가능합니다(최저임금법 §5②).");
        }
    }

    private boolean isAnnualLeaveApplicable(LaborContract c) {
        if (!isWeeklyAllowanceEligible(c.getContractedHoursPerWeek())) {
            return false;
        }
        if (c.getStoreId() == null) {
            return true;
        }
        return storeRepository.findById(c.getStoreId())
                .map(Store::isPremiumApplicable)
                .orElse(true);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
