package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.constant.MinorLaborStandards;
import com.rich.sodam.core.payroll.constant.SocialInsuranceRates;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.dto.response.LaborContractContextResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /**
     * 근로계약서를 저장한다. §17 필수 기재사항(임금 3요소·소정근로시간·휴일·연차·취업장소·업무) 누락 시 거부.
     *
     * <p>주 소정근로시간이 {@link LaborLawConstants#MIN_WEEKLY_HOURS_FOR_ALLOWANCE}(15시간) 미만이면
     * §18③ 에 따라 §55 휴일과 §60 연차유급휴가가 적용되지 않으므로, 입력값과 무관하게 저장 시 강제로 비운다.
     *
     * <p>소정근로일(contractedWeeklyDays)이 지정되면 직원-매장 관계에 전달한다.
     * 이 값이 설정되면 주휴수당 산정 시 폴백("출근≥1=개근") 대신 결근까지 정확 판정한다.
     */
    @Transactional
    public LaborContract save(LaborContract contract) {
        applyLaborLawExclusions(contract);
        normalizeProbation(contract);
        applySocialInsuranceEligibility(contract);
        assertRequiredFields(contract);
        LaborContract saved = laborContractRepository.save(contract);
        propagateContractedWeeklyDays(saved);
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
     * 계약의 소정근로일을 직원-매장 관계에 반영해 주휴 개근 판정 분모로 사용되게 한다.
     * 값이 없으면(미설정) 관계의 기존 값을 보존한다(폴백 동작 유지).
     */
    private void propagateContractedWeeklyDays(LaborContract contract) {
        Integer weeklyDays = contract.getContractedWeeklyDays();
        if (weeklyDays == null) {
            return;
        }
        employeeStoreRelationRepository
                .findRelation(contract.getEmployeeId(), contract.getStoreId())
                .ifPresent((EmployeeStoreRelation relation) -> {
                    relation.setContractedWeeklyDays(weeklyDays);
                    employeeStoreRelationRepository.save(relation);
                });
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
        if (c.getHourlyWage() == null || c.getHourlyWage() <= 0) {
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
