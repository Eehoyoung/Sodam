package com.rich.sodam.service;

import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.core.payroll.weeklyallowance.WeekStartPolicy;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculatorResolver;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyWorkPattern;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.dto.request.PayrollCalculationRequestDto;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.repository.*;
import com.rich.sodam.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.ObjectNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollService {
    private final AttendanceRepository attendanceRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollPolicyRepository payrollPolicyRepository;
    private final PayrollDetailRepository payrollDetailRepository;
    private final PayrollRepository payrollRepository;
    private final WeeklyAllowanceCalculatorResolver weeklyAllowanceResolver;
    private final com.rich.sodam.core.payroll.wage.NightWorkCalculator nightWorkCalculator;
    private final com.rich.sodam.core.payroll.wage.DailyWageCalculator dailyWageCalculator;
    private final com.rich.sodam.core.payroll.wage.WorkHoursCalculator workHoursCalculator;
    private final com.rich.sodam.core.payroll.wage.MonthlySalaryCalculator monthlySalaryCalculator;
    private final com.rich.sodam.core.payroll.deduction.SocialInsuranceCalculator socialInsuranceCalculator;
    private final WorkShiftRepository workShiftRepository;
    private final TimeOffRepository timeOffRepository;
    private final PlanAccessService planAccessService;
    private final PayslipFreeGrantService payslipFreeGrantService;
    private final PayrollBonusService payrollBonusService;
    private final LiveSyncPublisher liveSyncPublisher;
    private final NotificationService notificationService;

    /** 미리보기 워터마크 문구(매장 사장 플랜이 명세서 PDF 발급 권한 미보유 시). */
    private static final String PAYSLIP_WATERMARK = "소담 미리보기 · STARTER 플랜에서 정식 발급";

    /**
     * 임금명세서 투명성 고지 (사실 안내). 계산 근거·한계·최종 책임 주체를 명시해 사용자가
     * 자동산정 결과를 맹신하지 않도록 한다. SaaS 책임을 면제하는 법률 면책조항(약관)은 별도(변호사 검토).
     */
    private static final String PAYROLL_DISCLAIMER =
            "※ 본 명세서는 입력된 출퇴근·시급·정책을 바탕으로 노동관계법령 기준에 따라 자동 산정한 참고 자료입니다. "
                    + "4대보험·세액은 개략 추정치이며 공단/세무 신고가 최종입니다. "
                    + "근로자에 대한 임금 지급·명세서 교부·신고 의무와 그 정확성에 대한 최종 책임은 사업주에게 있습니다.";

    /**
     * 주휴수당 1주 기산 정책. application.yml: sodam.payroll.week-start-policy (기본 MONDAY).
     * HIRE_DATE_ANCHORED / MONDAY / SUNDAY / STORE_DEFINED. 노무·법률 검토로 기본값 확정 예정.
     */
    @Value("${sodam.payroll.week-start-policy:MONDAY}")
    private WeekStartPolicy weekStartPolicy;

    /**
     * 특정 기간의 급여 계산
     */
    @Transactional(readOnly = true)
    public int calculateWageForPeriod(Long employeeId, Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        // 직원-매장 관계 및 출근 기록 확인
        validateEmployeeStoreRelation(employeeId, storeId);

        // 해당 기간의 근무 기록 조회 (Fetch Join으로 N+1 쿼리 방지)
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndStoreIdAndPeriodWithDetails(
                        employeeId, storeId, startDate, endDate);

        // 급여 계산
        return attendances.stream()
                .filter(a -> a.getCheckOutTime() != null)
                .mapToInt(Attendance::calculateDailyWage)
                .sum();
    }

    /**
     * 월별 급여 계산 (DateTimeUtils 활용)
     */
    @Transactional(readOnly = true)
    public int calculateMonthlyWage(Long employeeId, Long storeId, int year, int month) {
        // 직원-매장 관계 확인
        validateEmployeeStoreRelation(employeeId, storeId);

        // DateTimeUtils 활용하여 월 시작/종료 시간 설정
        LocalDateTime startOfMonth = DateTimeUtils.getStartOfMonth(year, month);
        LocalDateTime endOfMonth = DateTimeUtils.getEndOfMonth(year, month);

        // 해당 월의 근무 기록 조회 (Fetch Join으로 N+1 쿼리 방지)
        List<Attendance> monthlyAttendances = attendanceRepository
                .findByEmployeeIdAndPeriodWithDetails(
                        employeeId, startOfMonth, endOfMonth);

        // 급여 계산
        return monthlyAttendances.stream()
                .filter(a -> a.getCheckOutTime() != null)
                .mapToInt(Attendance::calculateDailyWage)
                .sum();
    }

    // 직원-매장 관계 확인 헬퍼 메소드
    private void validateEmployeeStoreRelation(Long employeeId, Long storeId) {
        employeeStoreRelationRepository
                .findByEmployeeProfile_IdAndStore_Id(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        String.format("사원(ID: %d)-매장(ID: %d) 관계를 찾을 수 없습니다.", employeeId, storeId)));
    }


    @Transactional(readOnly = true)
    public List<EmployeeWageInfoDto> getEmployeeWageInfoInAllStores(Long employeeId) {
        EmployeeProfile employeeProfile = findEmployeeById(employeeId);
        List<EmployeeStoreRelation> relations = employeeStoreRelationRepository
                .findByEmployeeProfile(employeeProfile);

        List<EmployeeWageInfoDto> result = new ArrayList<>();
        for (EmployeeStoreRelation relation : relations) {
            result.add(createEmployeeWageInfoDto(employeeProfile, relation));
        }

        return result;
    }

    private EmployeeProfile findEmployeeById(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));
    }

    private Store findStoreById(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
    }

    private EmployeeStoreRelation findEmployeeStoreRelation(EmployeeProfile employeeProfile, Store store) {
        return employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));
    }

    private double calculateTotalWorkingHours(List<Attendance> attendances) {
        long totalMinutes = 0;
        for (Attendance attendance : attendances) {
            if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() != null) {
                totalMinutes += attendance.getWorkingTimeInMinutes();
            }
        }
        return totalMinutes / 60.0;
    }

    private EmployeeWageInfoDto createEmployeeWageInfoDto(EmployeeProfile employeeProfile, EmployeeStoreRelation relation) {
        Store store = relation.getStore();
        EmployeeWageInfoDto dto = new EmployeeWageInfoDto();

        dto.setEmployeeId(employeeProfile.getId());
        dto.setEmployeeName(employeeProfile.getUser().getName());
        dto.setStoreId(store.getId());
        dto.setStoreName(store.getStoreName());
        dto.setStoreStandardHourlyWage(store.getStoreStandardHourWage());
        dto.setCustomHourlyWage(relation.getCustomHourlyWage());
        dto.setUseStoreStandardWage(relation.getUseStoreStandardWage());
        dto.setAppliedHourlyWage(relation.getAppliedHourlyWage());
        // 고용형태(월급제) 정보 — 본인/해당 매장 사장만 접근하는 급여 DTO(급여 RBAC 유지)
        dto.setEmploymentType(relation.getEmploymentType());
        dto.setMonthlySalary(relation.getMonthlySalary());
        dto.setSocialInsuranceEnrolled(relation.getSocialInsuranceEnrolled());

        return dto;
    }

    /**
     * 주휴 수당을 계산하는 스케줄러 (매일 23:40).
     *
     * <p>⚠️ 정합성 주의: 이 스케줄러는 입사일 기준 회전 + 월말 truncate 로 attendance.weeklyAllowance 를
     * 채우는 구(舊) 경로다. 월 급여 집계({@code calculateTotalWeeklyAllowance})는 더 이상 이 저장값에
     * 의존하지 않고 week-start-policy(기본 MONDAY)로 주 단위 재계산한다(노무 검토 반영).
     * 두 경로의 주 기산이 달라 incompleteWeekAllowance 표시값과 실제 정산값이 다를 수 있다.
     * TODO[노무-정합]: 스케줄러도 weekStartPolicy 로 통일하거나, 표시 전용으로 역할 축소 — 별도 작업.</p>
     */
    @Scheduled(cron = "0 40 23 * * ?")
    @Transactional
    public void calculateWeeklyAllowances() throws ObjectNotFoundException {
        List<EmployeeProfile> employees = employeeProfileRepository.findAll();

        // 모든 직원에 대해 주휴수당 계산
        for (EmployeeProfile employee : employees) {
            calculateAndUpdateWeeklyAllowance(employee);
            employeeProfileRepository.save(employee);
        }
    }

    /**
     * 주휴 수당 계산 및 업데이트
     *
     * @param employee 직원 프로필
     */
    private void calculateAndUpdateWeeklyAllowance(EmployeeProfile employee) throws ObjectNotFoundException {
        LocalDate startDate = employee.getStartWeeklyAllowance();
        LocalDate endDate = employee.getEndWeeklyAllowance();
        LocalDate now = LocalDate.now();

        // 시작일이나 종료일이 설정되지 않은 경우 초기화
        if (startDate == null || endDate == null) {
            // 입사일 찾기
            LocalDate hireDate = findEarliestHireDate(employee);

            // 입사일 기준으로 주 시작일/종료일 설정
            startDate = hireDate;
            endDate = hireDate.plusDays(6);

            employee.setStartWeeklyAllowance(startDate);
            employee.setEndWeeklyAllowance(endDate);
        }


        // 종료일 조정 (현재 날짜, 월말 등 고려)
        endDate = adjustEndDateBasedOnMonthAndNow(endDate, startDate, now);

        // 기간 내 출근 기록 조회
        List<Attendance> attendances = findAttendancesBetweenDates(employee, startDate, endDate);

        // 주간 근무 시간 계산
        BigDecimal weeklyHours = calculateWeeklyHours(attendances);

        // 15시간 미만 근무는 주휴수당 미지급
        if (weeklyHours.compareTo(new BigDecimal(15)) < 0) {
            return;
        }

        // 주휴수당 계산 (스케줄러 표시 경로 — 소정근로일 미상이므로 폴백). 실제 정산은 calculateTotalWeeklyAllowance.
        BigDecimal weeklyAllowance = calculateWeeklyAllowance(attendances, weeklyHours, null);

        // 주가 바뀌는 경우 (이번 주 종료)
        if (isCarriedOverWeek(startDate, endDate, now)) {
            saveWeeklyAllowanceAndUpdateDates(employee, endDate, weeklyAllowance);
        }
        // 오늘이 주 종료일인 경우 (미완료 주휴수당 업데이트)
        else if (endDate.equals(now)) {
            employee.setIncompleteWeekAllowance(weeklyAllowance);
        }
    }

    /**
     * 종료일을 현재 날짜와 기준 월에 따라 조정
     */
    private LocalDate adjustEndDateBasedOnMonthAndNow(LocalDate endDate, LocalDate startDate, LocalDate now) {
        YearMonth yearMonth = YearMonth.from(startDate);
        LocalDate endOfMonth = yearMonth.atEndOfMonth();

        // 월말 고려
        if (endDate.isAfter(endOfMonth)) {
            endDate = endOfMonth;
        }
        // 종료일이 이미 지난 경우 7일로 조정
        else if (endDate.isBefore(now)) {
            endDate = startDate.plusDays(6);
        }

        return endDate;
    }

    /**
     * 시작일과 종료일 사이의 출석 데이터를 찾음
     */
    private List<Attendance> findAttendancesBetweenDates(EmployeeProfile employee, LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = DateTimeUtils.getStartOfDay(startDate);
        LocalDateTime endDateTime = DateTimeUtils.getEndOfDay(endDate);

        return attendanceRepository.findByEmployeeIdAndPeriodWithDetails(
                employee.getId(), startDateTime, endDateTime);
    }

    /**
     * 한 주간 근무 시간 계산
     */
    private BigDecimal calculateWeeklyHours(List<Attendance> attendances) {
        BigDecimal totalHours = BigDecimal.ZERO;

        for (Attendance attendance : attendances) {
            if (attendance.getCheckOutTime() != null) {
                double hours = attendance.getWorkingTimeInHours();
                totalHours = totalHours.add(BigDecimal.valueOf(hours));
            }
        }

        return totalHours;
    }

    /**
     * 주휴수당 계산 (시스템 core 로직 위임).
     *
     * <p>구(舊) 로직의 "평균 일급 × 0.2"(주 40h 근로자에게 법정의 20%만 지급 = 임금체불)을 폐기하고,
     * 근무 형태별 전략({@link WeeklyAllowanceCalculatorResolver})에 위임한다.
     * 법정 공식: 주휴시간 = min(1주 소정근로/40 × 8, 8) × 시급.</p>
     *
     * <p>현 데이터 모델은 소정근로시간·소정근로일을 별도 보관하지 않으므로 실근로 기준으로 추정한다:
     * <ul>
     *   <li>1주 소정근로시간 ≈ min(주 실근로시간, 40) — 연장근로가 주휴시간을 부풀리지 않도록 40h 캡</li>
     *   <li>시급 = 해당 주 출근기록의 적용시급(대표값)</li>
     *   <li>개근 여부 = 출근일 ≥ 1 (소정근로일 미보관 — 결근 판정 보강 대상)</li>
     * </ul>
     * </p>
     */
    private BigDecimal calculateWeeklyAllowance(List<Attendance> attendances, BigDecimal weeklyHours, Integer scheduledDays) {
        int workedDays = (int) attendances.stream()
                .filter(a -> a.getCheckOutTime() != null)
                .count();
        if (workedDays == 0) {
            return BigDecimal.ZERO;
        }

        // 대표 시급: 해당 주 출근기록의 적용시급 최댓값(주중 단일 시급이 일반적)
        int hourlyWage = attendances.stream()
                .filter(a -> a.getCheckOutTime() != null && a.getAppliedHourlyWage() != null)
                .mapToInt(Attendance::getAppliedHourlyWage)
                .max()
                .orElse(0);

        // 연장근로 제외를 위해 1주 소정근로시간을 40h 로 캡
        BigDecimal contractedHours = weeklyHours.min(LaborLawConstants.STATUTORY_WEEKLY_HOURS);

        // 소정근로일(scheduledDays) 가 설정되면 결근까지 정확 판정, null/0 이면 "출근≥1=개근" 폴백.
        WeeklyAllowanceContext context = new WeeklyAllowanceContext(
                BigDecimal.valueOf(hourlyWage),
                contractedHours,
                scheduledDays != null ? scheduledDays : 0,
                workedDays,
                WeeklyWorkPattern.AUTO
        );

        WeeklyAllowanceResult result = weeklyAllowanceResolver.resolve(context);
        return result.amount();
    }

    /**
     * 이어지는 주인지 확인
     */
    private boolean isCarriedOverWeek(LocalDate startDate, LocalDate endDate, LocalDate now) {
        return !endDate.minusDays(6).isEqual(startDate) && endDate.isEqual(now);
    }

    /**
     * 주휴 수당 저장 및 기간 업데이트
     */
    private void saveWeeklyAllowanceAndUpdateDates(EmployeeProfile employee, LocalDate endDate, BigDecimal weeklyAllowance) throws ObjectNotFoundException {
        // 마지막 출근기록 찾기 (Fetch Join으로 N+1 쿼리 방지)
        List<Attendance> recentAttendances = attendanceRepository.findByEmployeeIdAndPeriodWithDetails(
                employee.getId(),
                DateTimeUtils.getStartOfDay(endDate.minusDays(6)),
                DateTimeUtils.getEndOfDay(endDate));

        if (recentAttendances.isEmpty()) {
            throw new EntityNotFoundException("해당 기간의 출근 기록을 찾을 수 없습니다.");
        }

        // 마지막 출근기록에 주휴수당 저장
        Attendance lastAttendance = recentAttendances.get(0);
        lastAttendance.setWeeklyAllowance(weeklyAllowance);
        attendanceRepository.save(lastAttendance);

        // 다음 주 설정
        employee.setStartWeeklyAllowance(endDate.plusDays(1));
        employee.setEndWeeklyAllowance(endDate.plusDays(7));
        employee.setIncompleteWeekAllowance(null); // 완료된 주의 수당은 초기화
    }

    /**
     * 직원의 가장 빠른 입사일을 찾습니다.
     * 여러 매장에서 일하는 경우 가장 빠른 입사일을 기준으로 합니다.
     */
    private LocalDate findEarliestHireDate(EmployeeProfile employee) {
        List<EmployeeStoreRelation> relations =
                employeeStoreRelationRepository.findByEmployeeProfile(employee);

        if (relations.isEmpty()) {
            // 매장 관계가 없는 경우 사용자 생성일 또는 현재 날짜 사용
            return employee.getUser().getCreatedAt() != null ?
                    employee.getUser().getCreatedAt().toLocalDate() : LocalDate.now();
        }

        // 모든 매장 관계 중 가장 빠른 입사일 찾기
        return relations.stream()
                .map(EmployeeStoreRelation::getHireDate)
                .filter(Objects::nonNull) // null이 아닌 입사일만 필터링
                .min(LocalDate::compareTo) // 가장 빠른 날짜 찾기
                .orElseGet(() ->
                        // 입사일이 없는 경우 사용자 생성일 또는 현재 날짜 사용
                        employee.getUser().getCreatedAt() != null ?
                                employee.getUser().getCreatedAt().toLocalDate() : LocalDate.now()
                );
    }

    /**
     * 급여 계산 메서드
     * 특정 직원, 매장, 기간에 대한 급여를 계산하고 저장
     */
    @Transactional
    public Payroll calculatePayroll(PayrollCalculationRequestDto requestDto) {
        return calculatePayroll(
                requestDto.getEmployeeId(),
                requestDto.getStoreId(),
                requestDto.getStartDate(),
                requestDto.getEndDate(),
                requestDto.getRecalculate()
        );
    }

    /**
     * 매장 활성 직원 전체에 대한 일괄 급여 계산 (사장 정산 플로우 PRD_OWNER S-301).
     * 직원 한 명이 실패해도 전체 트랜잭션 중단 없이 나머지는 진행.
     */
    @Transactional
    public java.util.List<com.rich.sodam.dto.response.PayrollDto> calculatePayrollForStore(
            Long storeId, LocalDate startDate, LocalDate endDate) {
        var relations = employeeStoreRelationRepository
                .findByStore_Id(storeId).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .toList();

        java.util.List<com.rich.sodam.dto.response.PayrollDto> result = new java.util.ArrayList<>();
        for (var rel : relations) {
            if (rel.getEmployeeProfile() == null) continue;
            Long employeeId = rel.getEmployeeProfile().getId();
            try {
                Payroll p = calculatePayroll(employeeId, storeId, startDate, endDate, true);
                result.add(com.rich.sodam.dto.response.PayrollDto.from(p));
            } catch (Exception e) {
                log.warn("매장 일괄 정산 실패 emp={} store={} reason={}",
                        employeeId, storeId, e.getMessage());
            }
        }
        return result;
    }

    /**
     * 급여 계산 메서드
     * 특정 직원, 매장, 기간에 대한 급여를 계산하고 저장
     */
    @Transactional
    public Payroll calculatePayroll(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate) {
        return calculatePayroll(employeeId, storeId, startDate, endDate, false);
    }

    /**
     * 급여 계산 메서드 (재계산 옵션 포함)
     * 특정 직원, 매장, 기간에 대한 급여를 계산하고 저장
     */
    @Transactional
    public Payroll calculatePayroll(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate, boolean recalculate) {
        // 직원, 매장, 정책 정보 조회
        EmployeeProfile employee = findEmployeeById(employeeId);
        Store store = findStoreById(storeId);
        EmployeeStoreRelation relation = findEmployeeStoreRelation(employee, store);

        // 이미 급여가 계산된 경우 체크
        if (!recalculate) {
            Optional<Payroll> existingPayroll = payrollRepository.findByEmployeeIdAndPeriod(
                            employeeId, startDate, endDate).stream()
                    .filter(p -> p.getStore().getId().equals(storeId) &&
                            p.getStartDate().equals(startDate) &&
                            p.getEndDate().equals(endDate))
                    .findFirst();

            if (existingPayroll.isPresent()) {
                throw new BusinessException("이미 해당 기간에 대한 급여가 계산되었습니다. 재계산하려면 recalculate 옵션을 사용하세요.");
            }
        }

        // 급여 정책 조회
        PayrollPolicy policy = payrollPolicyRepository.findByStore(store)
                .orElseThrow(() -> new EntityNotFoundException("급여 정책을 찾을 수 없습니다."));

        // 해당 기간의 출근 기록 조회 (Fetch Join으로 N+1 쿼리 방지)
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndStoreIdAndPeriodWithDetails(
                        employeeId, storeId,
                        startDate.atStartOfDay(),
                        endDate.atTime(23, 59, 59));

        // 적용 단가 산정 — 고용형태 분기
        //  · 시급제(HOURLY): 관계의 적용시급(개별 또는 매장 기준) — 기존 경로 그대로(회귀 없음)
        //  · 월급제(MONTHLY_SALARY): 통상시급 = 월급 ÷ 월 통상임금 산정 기준시간(주40h 기준 209h,
        //    근로기준법 시행령 §6②). §56 연장·야간·휴일 가산과 결근·지각 공제의 기준 단가.
        boolean monthlySalaried = relation.isMonthlySalaried();
        if (relation.getEmploymentType() == EmploymentType.MONTHLY_SALARY && !monthlySalaried) {
            throw new BusinessException(
                    "월급제 직원의 월급(monthlySalary)이 설정되지 않아 급여를 계산할 수 없습니다.",
                    "MONTHLY_SALARY_REQUIRED");
        }
        int hourlyWage = monthlySalaried
                ? monthlySalaryCalculator.ordinaryHourlyWage(relation.getMonthlySalary(),
                relation.getContractedWeeklyDays(), policy.getRegularHoursPerDay())
                : relation.getAppliedHourlyWage();

        // 월급제: 일자별 실근로 집계 (시프트 대조로 결근·지각 공제/소정 외 추가 기본분 산정용)
        Map<LocalDate, Double> paidHoursByDate = new HashMap<>();
        Map<LocalDate, Double> regularHoursByDate = new HashMap<>();

        // 급여 엔티티 생성
        Payroll payroll = new Payroll();
        payroll.setEmployee(employee);
        payroll.setStore(store);
        payroll.setStartDate(startDate);
        payroll.setEndDate(endDate);
        payroll.setBaseHourlyWage(hourlyWage);

        // 시간 및 급여 초기화
        double totalRegularHours = 0;
        double totalOvertimeHours = 0;
        double totalNightWorkHours = 0;
        double totalHolidayWorkHours = 0;
        int totalRegularWage = 0;
        int totalOvertimeWage = 0;
        int totalNightWorkWage = 0;
        int totalHolidayWorkWage = 0;

        // 급여 상세 내역 생성 및 계산
        List<PayrollDetail> details = new ArrayList<>();

        for (Attendance attendance : attendances) {
            if (attendance.getCheckOutTime() == null) continue;

            // 근무 시간 계산 (명세서 표기용 시각)
            LocalTime startTime = attendance.getCheckInTime().toLocalTime();
            LocalTime endTime = attendance.getCheckOutTime().toLocalTime();
            LocalDate workDate = attendance.getCheckInTime().toLocalDate();

            // 근무 시간 분리 (기본/초과) — 실제 출퇴근 일시 기준 + 휴게시간 §54 공제 (자정통과 정확 처리)
            com.rich.sodam.core.payroll.wage.WorkHoursResult workHours = workHoursCalculator.calculate(
                    attendance.getCheckInTime(), attendance.getCheckOutTime(), policy.getRegularHoursPerDay());

            // 야간 근무 시간 계산 — 실제 출퇴근 일시 기준(자정통과 정확 처리, L-1)
            double nightWorkHours = nightWorkCalculator.calculate(
                    attendance.getCheckInTime(), attendance.getCheckOutTime(), policy.getNightWorkStartTime());

            boolean premiumApplicable = store.isPremiumApplicable();
            boolean holiday = attendance.isHolidayWork();

            // 휴일근로는 정상/연장 구조를 대체(§56②). 야간가산은 휴일에도 별도 적용.
            double regularHours = holiday ? 0 : workHours.regularHours();
            double overtimeHours = holiday ? 0 : workHours.overtimeHours();
            double holidayWorkHours = holiday ? workHours.paidHours() : 0;

            int regularWage;
            int overtimeWage;
            int holidayWorkWage;
            if (holiday) {
                regularWage = 0;
                overtimeWage = 0;
                holidayWorkWage = dailyWageCalculator.holidayWage(hourlyWage, holidayWorkHours, premiumApplicable);
            } else {
                // 급여 계산 — 기본 + 연장가산 분리, 5인 미만은 가산 제외 (L-2, L-4). 야간가산은 아래서 공통 계산.
                com.rich.sodam.core.payroll.wage.DailyWageResult wageResult =
                        dailyWageCalculator.calculate(hourlyWage, regularHours, overtimeHours, 0, premiumApplicable);
                regularWage = wageResult.regularWage();
                overtimeWage = wageResult.overtimeWage();
                holidayWorkWage = 0;
            }
            // 월급제: 소정근로 기본분(100%)은 월급에 이미 포함 — 일자별 기본급을 지급하면 이중지급.
            // 연장·야간 가산과 휴일근로(소정 외)는 통상시급 기준으로 그대로 별도 지급(§56).
            // 소정 외 근로의 기본 100%분·결근/지각 공제는 시프트 대조로 루프 종료 후 일괄 산정.
            if (monthlySalaried) {
                if (!holiday) {
                    regularWage = 0;
                    regularHoursByDate.merge(workDate, regularHours, Double::sum);
                }
                paidHoursByDate.merge(workDate, workHours.paidHours(), Double::sum);
            }
            // 야간가산(0.5 가산분)은 평일·휴일 공통 적용
            int nightWorkWage = dailyWageCalculator.calculate(hourlyWage, 0, 0, nightWorkHours, premiumApplicable).nightWorkWage();
            int dailyWage = regularWage + overtimeWage + holidayWorkWage + nightWorkWage;

            // 급여 상세 내역 저장
            PayrollDetail detail = new PayrollDetail();
            detail.setPayroll(payroll);
            detail.setAttendance(attendance);
            detail.setWorkDate(workDate);
            detail.setStartTime(startTime);
            detail.setEndTime(endTime);
            detail.setRegularHours(regularHours);
            detail.setOvertimeHours(overtimeHours);
            detail.setNightWorkHours(nightWorkHours);
            detail.setHolidayWorkHours(holidayWorkHours);
            detail.setHolidayWork(holiday);
            detail.setBaseHourlyWage(hourlyWage);
            detail.setRegularWage(regularWage);
            detail.setOvertimeWage(overtimeWage);
            detail.setNightWorkWage(nightWorkWage);
            detail.setHolidayWorkWage(holidayWorkWage);
            detail.setDailyWage(dailyWage);

            details.add(detail);

            // 합계 누적
            totalRegularHours += regularHours;
            totalOvertimeHours += overtimeHours;
            totalNightWorkHours += nightWorkHours;
            totalHolidayWorkHours += holidayWorkHours;
            totalRegularWage += regularWage;
            totalOvertimeWage += overtimeWage;
            totalNightWorkWage += nightWorkWage;
            totalHolidayWorkWage += holidayWorkWage;
        }

        // ── 월급제 기본급 확정: 일할 기본급 − 근태 공제 + 소정 외 추가 기본분 ──
        if (monthlySalaried) {
            int proratedBase = monthlySalaryCalculator.proratedBaseSalary(
                    relation.getMonthlySalary(), startDate, endDate, relation.getHireDate());
            MonthlyAttendanceAdjustment adjustment = calculateMonthlyAttendanceAdjustment(
                    relation, startDate, endDate, hourlyWage, policy.getRegularHoursPerDay(),
                    paidHoursByDate, regularHoursByDate);
            // 무노동 무임금 공제 — 단, 공제가 기본급을 초과하지 않도록 하한 0 (음수 급여 방지)
            totalRegularWage = Math.max(0, proratedBase - adjustment.deduction()) + adjustment.extraBasePay();
        }

        // 주휴수당 계산.
        // 월급제는 별도 가산하지 않는다 — 월 통상임금 산정 기준시간 209h 에 유급주휴 35h(8h×4.345주)가
        // 포함되어 있어 월급 자체에 주휴수당이 내재(시행령 §6②). 별도 지급 시 이중지급이 된다.
        int weeklyAllowance = 0;
        if (policy.getWeeklyAllowanceEnabled() && !monthlySalaried) {
            weeklyAllowance = calculateTotalWeeklyAllowance(employeeId, storeId, startDate, endDate);
        }

        // 즉시 보너스(급여합산형) 자동 합산 — "오늘 바빠서 1만원 더" 같은 비정기 포상금.
        // 통상임금·최저임금 산정에는 영향 없음(PayrollBonus 클래스 정책 주석 참고), 급여 총액에는 합산해 원천징수한다.
        List<PayrollBonus> unconsumedBonuses =
                payrollBonusService.findUnconsumedForPeriod(employeeId, storeId, startDate, endDate);
        int bonusWage = unconsumedBonuses.stream().mapToInt(PayrollBonus::getAmount).sum();

        // 총 급여 계산
        int grossWage = totalRegularWage + totalOvertimeWage + totalNightWorkWage
                + totalHolidayWorkWage + weeklyAllowance + bonusWage;

        // 세금 계산 — 개인별 4대보험 가입 여부(socialInsuranceEnrolled)가 매장 정책을 오버라이드.
        // null(기본)이면 매장 PayrollPolicy.taxPolicyType 그대로 — 기존 동작과 동일(회귀 없음).
        TaxPolicyType effectiveTaxPolicy = resolveTaxPolicy(relation, policy);
        int taxAmount = calculateTax(grossWage, effectiveTaxPolicy);

        // 임금명세서(§48②) 항목별 공제내역 — 4대보험 정책일 때 항목별 저장
        if (effectiveTaxPolicy == TaxPolicyType.FOUR_INSURANCES) {
            com.rich.sodam.core.payroll.deduction.DeductionBreakdown b =
                    socialInsuranceCalculator.breakdown(grossWage);
            payroll.setNationalPensionDeduction(b.nationalPension());
            payroll.setHealthInsuranceDeduction(b.healthInsurance());
            payroll.setLongTermCareDeduction(b.longTermCare());
            payroll.setEmploymentInsuranceDeduction(b.employmentInsurance());
        }

        // 실수령액 계산
        int netWage = grossWage - taxAmount;

        // 급여 정보 설정
        payroll.setRegularHours(totalRegularHours);
        payroll.setOvertimeHours(totalOvertimeHours);
        payroll.setNightWorkHours(totalNightWorkHours);
        payroll.setHolidayWorkHours(totalHolidayWorkHours);
        payroll.setRegularWage(totalRegularWage);
        payroll.setOvertimeWage(totalOvertimeWage);
        payroll.setNightWorkWage(totalNightWorkWage);
        payroll.setHolidayWorkWage(totalHolidayWorkWage);
        payroll.setWeeklyAllowance(weeklyAllowance);
        payroll.setBonusWage(bonusWage);
        payroll.setGrossWage(grossWage);
        payroll.setTaxRate(effectiveTaxPolicy == TaxPolicyType.INCOME_TAX_3_3 ? 0.033 : 0.0916);
        payroll.setTaxAmount(taxAmount);
        payroll.setDeductions(0); // 기타 공제액은 현재 없음
        payroll.setNetWage(netWage);
        payroll.setStatus(PayrollStatus.DRAFT);

        // 급여 저장
        Payroll savedPayroll = payrollRepository.save(payroll);

        // 급여 상세 내역 저장
        for (PayrollDetail detail : details) {
            detail.setPayroll(savedPayroll);
            payrollDetailRepository.save(detail);
        }

        // 이번 정산에 합산한 즉시 보너스를 소비 처리(멱등) — 재계산(recalculate) 시 기존 급여가
        // 삭제/대체되는 흐름이 아니라 새 Payroll 이 또 생기므로, 소비 처리는 항상 이번 payroll 기준으로 남긴다.
        if (!unconsumedBonuses.isEmpty()) {
            payrollBonusService.markConsumed(unconsumedBonuses, savedPayroll.getId());
        }

        // 급여 생성 라이브 동기화 — 사장 급여 목록·직원 급여 화면 즉시 반영 (afterCommit 은 publisher 내부 처리)
        if (savedPayroll.getStore() != null) {
            liveSyncPublisher.publishStore(savedPayroll.getStore().getId(),
                    LiveSyncPublisher.SyncType.PAYROLL_CHANGED);
        }

        return savedPayroll;
    }

    /**
     * 급여 단건 조회 (소유권 검증 등에 사용).
     */
    @Transactional(readOnly = true)
    public Payroll getPayrollById(Long payrollId) {
        return payrollRepository.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));
    }

    /**
     * 급여 발급 (확정→지급완료 원자 처리).
     *
     * <p>사장 정산 마법사의 "발급"은 한 번의 사용자 동작이지만, 상태머신은 DRAFT→CONFIRMED→PAID 를 강제한다.
     * FE 가 DRAFT 에서 곧바로 PAID 로 전이하려다 400 으로 전량 실패하던 문제(보강검토 M2)를 막기 위해,
     * 한 트랜잭션 안에서 필요한 중간 전이를 모두 수행한다. 이미 CONFIRMED 면 PAID 로만, 이미 PAID 면 멱등 통과.</p>
     */
    @Transactional
    public Payroll issuePayroll(Long payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));

        switch (payroll.getStatus()) {
            case DRAFT -> {
                updatePayrollStatus(payrollId, PayrollStatus.CONFIRMED);
                return updatePayrollStatus(payrollId, PayrollStatus.PAID);
            }
            case CONFIRMED -> {
                return updatePayrollStatus(payrollId, PayrollStatus.PAID);
            }
            case PAID -> {
                return payroll; // 멱등: 이미 발급됨
            }
            default -> throw new InvalidOperationException("취소된 급여는 발급할 수 없습니다.");
        }
    }

    /**
     * 급여 상태 업데이트
     */
    @Transactional
    public Payroll updatePayrollStatus(Long payrollId, PayrollStatus newStatus) {
        return updatePayrollStatus(payrollId, newStatus, null, null);
    }

    /**
     * 급여 상태 업데이트 (지급일 및 취소 사유 포함)
     */
    @Transactional
    public Payroll updatePayrollStatus(Long payrollId, PayrollStatus newStatus,
                                       LocalDate paymentDate, String cancelReason) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));

        // 현재 상태와 새 상태 확인
        PayrollStatus currentStatus = payroll.getStatus();

        // 상태 변경 유효성 검사
        validateStatusTransition(currentStatus, newStatus);

        // 상태 업데이트
        payroll.setStatus(newStatus);

        // 지급일 설정 (PAID 상태로 변경 시)
        if (newStatus == PayrollStatus.PAID) {
            payroll.setPaymentDate(paymentDate != null ? paymentDate : LocalDate.now());
        }

        // 취소 사유 설정 (CANCELLED 상태로 변경 시)
        if (newStatus == PayrollStatus.CANCELLED) {
            payroll.setCancelReason(cancelReason);
        }

        Payroll saved = payrollRepository.save(payroll);

        // 상태 전이 라이브 동기화 — 확정/지급/취소가 사장·직원 급여 화면에 즉시 반영
        if (saved.getStore() != null) {
            liveSyncPublisher.publishStore(saved.getStore().getId(),
                    LiveSyncPublisher.SyncType.PAYROLL_CHANGED);
        }

        // 지급 완료 → 직원에게 FCM. 커밋 후 발송(롤백된 지급으로 알림 금지),
        // 이름/금액은 세션이 살아있는 지금 미리 풀어둔다. issuePayroll 의 DRAFT→CONFIRMED→PAID
        // 원자 전이에서도 직원 알림은 PAID 1회만 나간다.
        if (newStatus == PayrollStatus.PAID) {
            notifyEmployeePaidAfterCommit(saved);
        }

        return saved;
    }

    /** 급여 지급 완료를 직원에게 커밋 후 푸시. 실패는 삼킨다(알림이 정산 트랜잭션을 깨지 않게). */
    private void notifyEmployeePaidAfterCommit(Payroll payroll) {
        try {
            if (payroll.getEmployee() == null || payroll.getEmployee().getUser() == null) {
                return;
            }
            Long employeeUserId = payroll.getEmployee().getUser().getId();
            String storeName = payroll.getStore() != null && payroll.getStore().getStoreName() != null
                    ? payroll.getStore().getStoreName() : "매장";
            int netWage = payroll.getNetWage() != null ? payroll.getNetWage() : 0;
            String monthLabel = payroll.getStartDate() != null
                    ? payroll.getStartDate().getMonthValue() + "월분" : "이번 달";
            Runnable send = () ->
                    notificationService.notifyPayrollPaid(employeeUserId, storeName, netWage, monthLabel);
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                        new org.springframework.transaction.support.TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                send.run();
                            }
                        });
            } else {
                send.run();
            }
        } catch (Exception e) {
            log.debug("급여 지급 직원 푸시 스킵: {}", e.getMessage());
        }
    }

    /**
     * 직원의 급여 내역 조회
     */
    @Transactional(readOnly = true)
    public List<Payroll> getEmployeePayrolls(Long employeeId, LocalDate from, LocalDate to) {
        // 직원 존재 확인
        if (!employeeProfileRepository.existsById(employeeId)) {
            throw new EntityNotFoundException("직원을 찾을 수 없습니다.");
        }

        return payrollRepository.findByEmployeeIdAndPeriod(employeeId, from, to);
    }

    /**
     * 매장의 급여 내역 조회
     */
    @Transactional(readOnly = true)
    public List<Payroll> getStorePayrolls(Long storeId, LocalDate from, LocalDate to) {
        // 매장 존재 확인
        if (!storeRepository.existsById(storeId)) {
            throw new EntityNotFoundException("매장을 찾을 수 없습니다.");
        }

        return payrollRepository.findByStoreIdAndPeriod(storeId, from, to);
    }

    /**
     * 급여 상세 내역 조회
     */
    @Transactional(readOnly = true)
    public List<PayrollDetail> getPayrollDetails(Long payrollId) {
        // 급여 존재 확인
        if (!payrollRepository.existsById(payrollId)) {
            throw new EntityNotFoundException("급여 내역을 찾을 수 없습니다.");
        }

        return payrollDetailRepository.findByPayroll_IdOrderByWorkDateAsc(payrollId);
    }

    /**
     * 급여명세서 PDF 생성 (HIGH-BE-002)
     * 기본 구현: 텍스트 기반 급여명세서를 바이트 배열로 반환
     * <p>
     * TODO: 추후 iText, Apache PDFBox 등의 PDF 라이브러리로 교체하여
     *       실제 PDF 레이아웃, 폰트, 이미지 등을 포함한 전문적인 명세서 생성 가능
     *
     * @param payrollId 급여 ID
     * @return PDF 바이트 배열 (현재는 UTF-8 텍스트)
     * @throws EntityNotFoundException 급여 내역을 찾을 수 없을 경우
     */
    @Transactional(readOnly = true)
    public byte[] generatePayrollPdf(Long payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다. ID: " + payrollId));
        List<PayrollDetail> details = payrollDetailRepository.findByPayroll_IdOrderByWorkDateAsc(payrollId);

        // 게이팅: 매장 사장 플랜이 명세서 PDF 발급 권한(STARTER+)을 보유하지 않으면 워터마크(미리보기).
        // 하드 차단(402)은 직원의 본인 명세서 조회까지 막으므로, 발급은 허용하되 워터마크로 "정식 발급 아님"을 표시.
        // B4(2026-06-18 승인): 무료 플랜도 매장당 "월 1회"는 워터마크 없이 정식 발급(가치 각인 후 페이월).
        boolean watermark;
        if (payroll.getStore() == null) {
            watermark = true;
        } else if (planAccessService.storeOwnerHasFeature(
                payroll.getStore().getId(), com.rich.sodam.domain.type.PlanFeature.PAYSLIP_PDF)) {
            watermark = false; // 유료(STARTER+): 항상 정식
        } else if (payslipFreeGrantService.tryConsumeFreeGrant(
                payroll.getStore().getId(), java.time.YearMonth.now())) {
            watermark = false; // 무료 플랜 이번 달 첫 발급 → 정식(무료 1회)
        } else {
            watermark = true;  // 무료 플랜 2건째부터 → 워터마크(미리보기)
        }

        try (java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4);
            com.lowagie.text.pdf.PdfWriter writer = com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);

            // 한글 지원 폰트 — 시스템 폰트 fallback (운영에서는 NanumGothic.ttf 번들 권장)
            com.lowagie.text.pdf.BaseFont bf;
            try {
                bf = com.lowagie.text.pdf.BaseFont.createFont(
                        "HYSMyeongJoStd-Medium", "UniKS-UCS2-H",
                        com.lowagie.text.pdf.BaseFont.NOT_EMBEDDED);
            } catch (Exception ignored) {
                bf = com.lowagie.text.pdf.BaseFont.createFont();
            }
            com.lowagie.text.Font fontTitle = new com.lowagie.text.Font(bf, 18, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font fontH = new com.lowagie.text.Font(bf, 12, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font fontN = new com.lowagie.text.Font(bf, 10);

            if (watermark) {
                writer.setPageEvent(new PayslipWatermarkEvent(bf, PAYSLIP_WATERMARK));
            }

            document.open();
            document.add(new com.lowagie.text.Paragraph("급여 명세서", fontTitle));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));

            String emp = payroll.getEmployee() != null && payroll.getEmployee().getUser() != null
                    ? payroll.getEmployee().getUser().getName() : "-";
            String store = payroll.getStore() != null ? payroll.getStore().getStoreName() : "-";
            document.add(new com.lowagie.text.Paragraph("직원: " + emp, fontN));
            document.add(new com.lowagie.text.Paragraph("매장: " + store, fontN));
            document.add(new com.lowagie.text.Paragraph(
                    "기간: " + payroll.getStartDate() + " ~ " + payroll.getEndDate(), fontN));
            document.add(new com.lowagie.text.Paragraph(" ", fontN));

            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(2);
            table.setWidthPercentage(100);
            // 임금명세서 §48② 필수: 지급일·근로일수
            addKv(table, "지급일",
                    payroll.getPaymentDate() != null ? payroll.getPaymentDate().toString() : "미지정", fontH, fontN);
            addKv(table, "근로일수", details.size() + "일", fontH, fontN);
            addKv(table, "기본 근무 시간",
                    String.format("%.1fh", nz(payroll.getRegularHours())), fontH, fontN);
            addKv(table, "연장 근무 시간",
                    String.format("%.1fh", nz(payroll.getOvertimeHours())), fontH, fontN);
            addKv(table, "야간 근무 시간",
                    String.format("%.1fh", nz(payroll.getNightWorkHours())), fontH, fontN);
            // 지급 항목 (§48② 항목별 지급내역)
            addKv(table, "[지급] 기본급",
                    String.format("%,d원", nz(payroll.getRegularWage())), fontH, fontN);
            addKv(table, "[지급] 연장수당",
                    String.format("%,d원", nz(payroll.getOvertimeWage())), fontH, fontN);
            addKv(table, "[지급] 야간수당",
                    String.format("%,d원", nz(payroll.getNightWorkWage())), fontH, fontN);
            addKv(table, "[지급] 휴일수당",
                    String.format("%,d원", nz(payroll.getHolidayWorkWage())), fontH, fontN);
            addKv(table, "[지급] 주휴수당",
                    String.format("%,d원", nz(payroll.getWeeklyAllowance())), fontH, fontN);
            addKv(table, "지급총액 (세전)",
                    String.format("%,d원", nz(payroll.getGrossWage())), fontH, fontN);
            // 공제 항목 (§48② 항목별 공제내역)
            addDeductionRows(table, payroll, fontH, fontN);
            addKv(table, "실수령액",
                    String.format("%,d원", nz(payroll.getNetWage())), fontH, fontN);
            addKv(table, "상태", payroll.getStatus() != null ? payroll.getStatus().name() : "-", fontH, fontN);
            document.add(table);

            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(
                    "근무 상세 (" + details.size() + "건)", fontH));
            for (PayrollDetail d : details) {
                double dh = nz(d.getRegularHours()) + nz(d.getOvertimeHours()) + nz(d.getNightWorkHours());
                document.add(new com.lowagie.text.Paragraph(
                        String.format("%s · %.1fh · %,d원",
                                d.getWorkDate(), dh, nz(d.getDailyWage())), fontN));
            }
            document.add(new com.lowagie.text.Paragraph(" ", fontN));
            document.add(new com.lowagie.text.Paragraph(PAYROLL_DISCLAIMER, fontN));
            document.add(new com.lowagie.text.Paragraph(
                    "발급: 소담(SODAM) — 본 명세서는 전자 문서로 유효합니다.", fontN));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("급여 PDF 생성 실패", e);
            return generatePayrollTextFallback(payroll, details);
        }
    }

    private static double nz(Double v) { return v == null ? 0 : v; }
    private static int nz(Integer v) { return v == null ? 0 : v; }
    private static void addKv(com.lowagie.text.pdf.PdfPTable t, String k, String v,
                              com.lowagie.text.Font fh, com.lowagie.text.Font fn) {
        t.addCell(new com.lowagie.text.Phrase(k, fh));
        t.addCell(new com.lowagie.text.Phrase(v, fn));
    }

    /** PDF 명세서에 §48② 항목별 공제내역을 정책에 맞춰 추가. */
    private void addDeductionRows(com.lowagie.text.pdf.PdfPTable t, Payroll payroll,
                                  com.lowagie.text.Font fh, com.lowagie.text.Font fn) {
        if (isWithholdingPolicy(payroll)) {
            addKv(t, "[공제] 소득세(3.3%)", String.format("-%,d원", nz(payroll.getTaxAmount())), fh, fn);
        } else {
            addKv(t, "[공제] 국민연금", String.format("-%,d원", nz(payroll.getNationalPensionDeduction())), fh, fn);
            addKv(t, "[공제] 건강보험", String.format("-%,d원", nz(payroll.getHealthInsuranceDeduction())), fh, fn);
            addKv(t, "[공제] 장기요양", String.format("-%,d원", nz(payroll.getLongTermCareDeduction())), fh, fn);
            addKv(t, "[공제] 고용보험", String.format("-%,d원", nz(payroll.getEmploymentInsuranceDeduction())), fh, fn);
        }
        addKv(t, "공제총액", String.format("-%,d원", nz(payroll.getTaxAmount())), fh, fn);
    }

    /** PDF 생성 실패 시 텍스트 폴백 (구 동작 유지). */
    private byte[] generatePayrollTextFallback(Payroll payroll, List<PayrollDetail> details) {
        StringBuilder pdfContent = new StringBuilder();
        pdfContent.append("===========================================\n");
        pdfContent.append("           급여 명세서\n");
        pdfContent.append("===========================================\n\n");
        pdfContent.append("급여 ID: ").append(payroll.getId()).append("\n");
        pdfContent.append("직원명: ").append(payroll.getEmployee().getUser().getName()).append("\n");
        pdfContent.append("매장명: ").append(payroll.getStore().getStoreName()).append("\n");
        pdfContent.append("급여 기간: ").append(payroll.getStartDate()).append(" ~ ").append(payroll.getEndDate()).append("\n");
        pdfContent.append("-------------------------------------------\n");

        // 총 근무시간 계산 (regularHours + overtimeHours + nightWorkHours)
        double totalHours = (payroll.getRegularHours() != null ? payroll.getRegularHours() : 0.0)
                + (payroll.getOvertimeHours() != null ? payroll.getOvertimeHours() : 0.0)
                + (payroll.getNightWorkHours() != null ? payroll.getNightWorkHours() : 0.0);
        pdfContent.append("총 근무시간: ").append(String.format("%.2f", totalHours)).append(" 시간\n");
        pdfContent.append("근로일수: ").append(details.size()).append(" 일\n");

        // 지급 항목 (임금명세서 §48② — 항목별 지급내역)
        pdfContent.append("[지급 항목]\n");
        pdfContent.append("  기본급: ").append(String.format("%,d", nz(payroll.getRegularWage()))).append(" 원\n");
        pdfContent.append("  연장수당: ").append(String.format("%,d", nz(payroll.getOvertimeWage()))).append(" 원\n");
        pdfContent.append("  야간수당: ").append(String.format("%,d", nz(payroll.getNightWorkWage()))).append(" 원\n");
        pdfContent.append("  휴일수당: ").append(String.format("%,d", nz(payroll.getHolidayWorkWage()))).append(" 원\n");
        pdfContent.append("  주휴수당: ").append(String.format("%,d", nz(payroll.getWeeklyAllowance()))).append(" 원\n");
        pdfContent.append("  지급총액: ").append(String.format("%,d", nz(payroll.getGrossWage()))).append(" 원\n");

        // 공제 항목 (임금명세서 §48② — 항목별 공제내역)
        pdfContent.append("[공제 항목]\n");
        appendDeductionBreakdown(pdfContent, payroll);

        pdfContent.append("실수령액: ").append(String.format("%,d", nz(payroll.getNetWage()))).append(" 원\n");
        pdfContent.append("-------------------------------------------\n");
        pdfContent.append("상태: ").append(payroll.getStatus()).append("\n");
        pdfContent.append("계산일: ").append(payroll.getCreatedAt()).append("\n");
        pdfContent.append("-------------------------------------------\n");
        pdfContent.append(PAYROLL_DISCLAIMER).append("\n");
        pdfContent.append("\n");
        pdfContent.append("===========================================\n");
        pdfContent.append("상세 근무 내역 (").append(details.size()).append("건)\n");
        pdfContent.append("===========================================\n");

        for (PayrollDetail detail : details) {
            // 상세 내역의 총 근무시간 계산
            double detailTotalHours = (detail.getRegularHours() != null ? detail.getRegularHours() : 0.0)
                    + (detail.getOvertimeHours() != null ? detail.getOvertimeHours() : 0.0)
                    + (detail.getNightWorkHours() != null ? detail.getNightWorkHours() : 0.0);
            pdfContent.append(detail.getWorkDate()).append(" | ");
            pdfContent.append(String.format("%.2f", detailTotalHours)).append("시간 | ");
            pdfContent.append(String.format("%,d", detail.getDailyWage())).append("원\n");
        }

        pdfContent.append("\n");
        pdfContent.append("※ 본 명세서는 기본 텍스트 형식입니다.\n");
        pdfContent.append("※ 추후 정식 PDF 레이아웃으로 업그레이드될 예정입니다.\n");

        // UTF-8 바이트 배열로 반환 (추후 PDF 라이브러리로 교체 가능)
        return pdfContent.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * 주휴수당을 급여에 통합 (월 급여 집계).
     *
     * <p>구(舊) 로직은 스케줄러가 마감한 주의 마지막 출근기록에만 저장된 {@code attendance.weeklyAllowance}
     * 를 합산해, 마감되지 않은 주·미완료 주가 월 급여에서 누락되어 <b>주휴수당 과소지급(임금체불)</b> 위험이
     * 있었다(노무 재검증 🚨-A). 이를 제거하기 위해, 정산 기간을 주(월요일 시작) 단위로 묶어 각 주의 주휴수당을
     * core 전략으로 직접 재계산·합산한다. 스케줄러 저장값에 의존하지 않는다.</p>
     *
     * <p>⚠️ 월 경계에 걸친 주(週)는 정산월 내 출근일만 집계되어 소정근로시간이 일부만 반영될 수 있다.
     * 월 경계·교대 4주 평균 처리는 외부 노무사 확인 권장 항목(노무 검증 보고서 §1).</p>
     */
    private int calculateTotalWeeklyAllowance(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate) {
        // 입사일 기산 정책일 때만 입사일 조회 (불필요한 쿼리 회피)
        LocalDate hireAnchor = (weekStartPolicy == WeekStartPolicy.HIRE_DATE_ANCHORED)
                ? findEarliestHireDate(findEmployeeById(employeeId))
                : null;

        // 소정근로일(개근 판정 분모) — 직원-매장 관계에 설정돼 있으면 사용, 없으면 null(폴백)
        Integer scheduledDays = findEmployeeStoreRelation(findEmployeeById(employeeId), findStoreById(storeId))
                .getContractedWeeklyDays();

        // 월 경계에 걸친 주를 쪼개지 않기 위해 조회 범위를 "정산월에 걸친 주(週) 전체"로 확장한다.
        // (노무·법률 검토 결론: 주 종료일이 속한 월에 그 주의 주휴수당을 전액 귀속, 분할·중복 금지.
        //  귀속월 규칙은 시스템 고정값 — 사업장 설정으로 열지 않는다.)
        LocalDate firstWeekStart = weekStartPolicy.weekStartOf(startDate, hireAnchor);
        LocalDate lastWeekEnd = weekStartPolicy.weekStartOf(endDate, hireAnchor).plusDays(6);

        List<Attendance> attendances = attendanceRepository
                .findByEmployeeIdAndStoreIdAndPeriodWithDetails(
                        employeeId, storeId, firstWeekStart.atStartOfDay(), lastWeekEnd.atTime(23, 59, 59));

        // 주(週) 기산 정책에 따라 출근기록 그룹핑 (주 전체 — 전월·익월 출근 포함)
        Map<LocalDate, List<Attendance>> byWeek = new HashMap<>();
        for (Attendance a : attendances) {
            if (a.getCheckOutTime() == null) continue;
            LocalDate workDate = a.getCheckInTime().toLocalDate();
            LocalDate weekStart = weekStartPolicy.weekStartOf(workDate, hireAnchor);
            byWeek.computeIfAbsent(weekStart, k -> new ArrayList<>()).add(a);
        }

        // 주 종료일(주휴일)이 정산월에 속하는 주만, 그 주 전체로 산정해 전액 귀속 (분할·중복 방지).
        int total = 0;
        for (Map.Entry<LocalDate, List<Attendance>> entry : byWeek.entrySet()) {
            LocalDate weekEnd = entry.getKey().plusDays(6);
            boolean belongsToThisMonth = !weekEnd.isBefore(startDate) && !weekEnd.isAfter(endDate);
            if (!belongsToThisMonth) {
                continue; // 주 종료일이 전월/익월 → 그 달 정산에 귀속 (이번 달에서 제외)
            }
            BigDecimal weeklyHours = calculateWeeklyHours(entry.getValue());
            BigDecimal allowance = calculateWeeklyAllowance(entry.getValue(), weeklyHours, scheduledDays);
            total += allowance.setScale(0, RoundingMode.HALF_UP).intValue();
        }
        return total;
    }

    /**
     * 임금명세서(§48②) 공제 항목을 정책에 맞춰 항목별로 출력한다.
     * 3.3% 정책은 사업소득 원천징수 단일 항목, 4대보험 정책은 국민연금·건강·장기요양·고용 항목별.
     */
    private void appendDeductionBreakdown(StringBuilder sb, Payroll payroll) {
        if (isWithholdingPolicy(payroll)) {
            sb.append("  소득세(3.3% 원천징수): ")
                    .append(String.format("%,d", nz(payroll.getTaxAmount()))).append(" 원\n");
        } else {
            sb.append("  국민연금: ").append(String.format("%,d", nz(payroll.getNationalPensionDeduction()))).append(" 원\n");
            sb.append("  건강보험: ").append(String.format("%,d", nz(payroll.getHealthInsuranceDeduction()))).append(" 원\n");
            sb.append("  장기요양: ").append(String.format("%,d", nz(payroll.getLongTermCareDeduction()))).append(" 원\n");
            sb.append("  고용보험: ").append(String.format("%,d", nz(payroll.getEmploymentInsuranceDeduction()))).append(" 원\n");
        }
        sb.append("  공제총액: ").append(String.format("%,d", nz(payroll.getTaxAmount()))).append(" 원\n");
        sb.append("  ※ 4대보험은 개략 추정치이며 공단 EDI 정산이 최종입니다.\n");
    }

    /** 3.3% 사업소득 원천징수 정책 여부(세율로 판별). */
    private boolean isWithholdingPolicy(Payroll payroll) {
        return payroll.getTaxRate() != null && Math.abs(payroll.getTaxRate() - 0.033) < 1e-9;
    }

    /**
     * 개인 오버라이드를 반영한 실효 세금(공제) 정책.
     * socialInsuranceEnrolled: null=매장 정책 따름(기존 동작), true=4대보험, false=3.3% 원천징수.
     */
    private TaxPolicyType resolveTaxPolicy(EmployeeStoreRelation relation, PayrollPolicy policy) {
        Boolean enrolled = relation.getSocialInsuranceEnrolled();
        if (enrolled == null) {
            return policy.getTaxPolicyType();
        }
        return enrolled ? TaxPolicyType.FOUR_INSURANCES : TaxPolicyType.INCOME_TAX_3_3;
    }

    /** 월급제 근태 조정 결과. deduction=결근·지각/조퇴 공제(원), extraBasePay=소정 외 근로 기본 100%분(원). */
    private record MonthlyAttendanceAdjustment(int deduction, int extraBasePay) {
    }

    /**
     * 월급제 근태 공제·소정 외 기본분 산정 — <b>확정된 시프트(WorkShift)</b>를 소정근로일로 삼아
     * 실제 출근기록과 대조한다.
     *
     * <p><b>공제 방식(무노동 무임금 원칙)</b>: 통상시급 × 미근무 소정근로시간.
     * 고용노동부 행정해석(근기 68207-690 계열)이 인정하는 결근 공제 방식 중
     * "월급 ÷ 209시간 × 8시간 × 결근일수"(시간급 환산 공제)를 실제 시프트 길이로 일반화한 것이다.
     * 지각·조퇴(부분 미근무)와 결근(전일 미근무)을 동일 단가로 일관 공제하고,
     * 단시간 시프트 결근 시 8h 일급을 통째로 공제하는 과공제를 막는다.</p>
     *
     * <p><b>안전장치(임금체불 방지 방향)</b>:
     * <ul>
     *   <li>확정(confirmedAt) 시프트만 소정근로일로 인정 — 미확정 초안으로 공제하지 않는다</li>
     *   <li>승인된 휴가(TimeOff APPROVED) 일자는 결근 공제에서 제외 — 유·무급 구분이 없어
     *       무급휴가도 공제하지 않는다(과지급 방향 안전. 무급휴직 공제는 노무사 확인 항목)</li>
     *   <li>입사일 이전 시프트 제외 (월중 입사 시 일할 기본급과 이중 반영 방지)</li>
     *   <li>기간 내 확정 시프트가 없으면(스케줄 미사용 매장) 공제·추가분 모두 0 —
     *       소정근로일을 판정할 수 없으므로 출근기록의 소정근로는 월급에 포함된 것으로 간주</li>
     *   <li>결근 주(週)의 주휴 상실분 추가 공제(시행령 §30① 개근 요건)는 자동 적용하지 않는다
     *       (과지급 방향 안전 — 결근 시에도 월급 내재 주휴분은 남는다. 노무사 확인 항목)</li>
     * </ul></p>
     *
     * <p><b>소정 외 추가 기본분</b>: 시프트 없는 날의 근무 또는 시프트를 초과한 근무의
     * "기본 100%"는 209h 월급에 포함되어 있지 않으므로 통상시급 × 초과시간(일 소정 8h 한도 내)으로
     * 지급한다. 일 8h 초과분의 연장가산(§56)·야간가산은 기존 경로가 별도 지급하므로 여기서는 기본분만.</p>
     */
    private MonthlyAttendanceAdjustment calculateMonthlyAttendanceAdjustment(
            EmployeeStoreRelation relation, LocalDate startDate, LocalDate endDate,
            int ordinaryHourlyWage, double regularHoursPerDay,
            Map<LocalDate, Double> paidHoursByDate, Map<LocalDate, Double> regularHoursByDate) {

        List<WorkShift> confirmedShifts = workShiftRepository
                .findByEmployeeIdAndStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNull(
                        relation.getEmployeeProfile().getId(), relation.getStore().getId(), startDate, endDate);
        if (confirmedShifts.isEmpty()) {
            return new MonthlyAttendanceAdjustment(0, 0);
        }

        LocalDate hireDate = relation.getHireDate();

        // 일자별 소정근로시간 — 휴게(§54) 공제 후, 일 소정(보통 8h) 캡.
        // 캡 이유: 시프트가 8h를 넘겨도 월급이 커버하는 것은 소정근로분까지이고,
        // 초과분은 연장근로로서 출근 시 별도 지급·미출근 시 미발생(공제 대상 아님)이기 때문.
        Map<LocalDate, Double> scheduledByDate = new HashMap<>();
        for (WorkShift shift : confirmedShifts) {
            if (hireDate != null && shift.getShiftDate().isBefore(hireDate)) {
                continue;
            }
            LocalDateTime shiftStart = shift.getShiftDate().atTime(shift.getStartTime());
            LocalDateTime shiftEnd = shift.crossesMidnight()
                    ? shift.getShiftDate().plusDays(1).atTime(shift.getEndTime())   // 야간 시프트: 익일 종료
                    : shift.getShiftDate().atTime(shift.getEndTime());
            double netHours = workHoursCalculator
                    .calculate(shiftStart, shiftEnd, regularHoursPerDay).paidHours();
            scheduledByDate.merge(shift.getShiftDate(), netHours, Double::sum);
        }
        scheduledByDate.replaceAll((date, hours) -> Math.min(hours, regularHoursPerDay));

        Set<LocalDate> approvedTimeOffDates = approvedTimeOffDates(relation, startDate, endDate);

        // 결근·지각·조퇴 공제 (일자별 상계 — 다른 날의 초과근무가 미근무를 상쇄하지 못하게 max(0,·))
        long deduction = 0;
        for (Map.Entry<LocalDate, Double> scheduled : scheduledByDate.entrySet()) {
            if (approvedTimeOffDates.contains(scheduled.getKey())) {
                continue;
            }
            double actual = paidHoursByDate.getOrDefault(scheduled.getKey(), 0.0);
            double shortfallHours = Math.max(0, scheduled.getValue() - actual);
            if (shortfallHours > 0) {
                deduction += Math.round(ordinaryHourlyWage * shortfallHours);
            }
        }

        // 소정 외 근로의 기본 100%분 (시프트 외 근무일·시프트 초과 소정 내 근무)
        long extraBasePay = 0;
        for (Map.Entry<LocalDate, Double> worked : regularHoursByDate.entrySet()) {
            double covered = scheduledByDate.getOrDefault(worked.getKey(), 0.0);
            double extraHours = Math.max(0, worked.getValue() - covered);
            if (extraHours > 0) {
                extraBasePay += Math.round(ordinaryHourlyWage * extraHours);
            }
        }
        return new MonthlyAttendanceAdjustment((int) deduction, (int) extraBasePay);
    }

    /** 기간 내 승인(APPROVED)된 휴가 일자 집합 — 월급제 결근 공제 제외용. */
    private Set<LocalDate> approvedTimeOffDates(EmployeeStoreRelation relation, LocalDate startDate, LocalDate endDate) {
        Set<LocalDate> dates = new HashSet<>();
        List<TimeOff> approved = timeOffRepository
                .findByEmployeeAndStatus(relation.getEmployeeProfile(), TimeOffStatus.APPROVED);
        for (TimeOff timeOff : approved) {
            if (timeOff.getStore() == null
                    || !timeOff.getStore().getId().equals(relation.getStore().getId())
                    || timeOff.getStartDate() == null || timeOff.getEndDate() == null) {
                continue;
            }
            LocalDate from = timeOff.getStartDate().isAfter(startDate) ? timeOff.getStartDate() : startDate;
            LocalDate to = timeOff.getEndDate().isBefore(endDate) ? timeOff.getEndDate() : endDate;
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                dates.add(d);
            }
        }
        return dates;
    }

    /**
     * 세금 계산
     */
    private int calculateTax(int grossWage, TaxPolicyType taxPolicyType) {
        switch (taxPolicyType) {
            case INCOME_TAX_3_3:
                // 3.3% 사업소득 원천징수 (프리랜서/일용)
                return (int) Math.round(grossWage * 0.033);
            case FOUR_INSURANCES:
                // 4대보험 근로자 부담 (2026 요율) — SocialInsuranceCalculator 위임.
                // 국민연금 상·하한 캡, 장기요양 건강보험료 기준 2단계 등 정확 계산.
                return socialInsuranceCalculator.totalEmployeeDeduction(grossWage);
            default:
                return 0;
        }
    }

    /**
     * 급여 상태 변경 유효성 검사
     */
    private void validateStatusTransition(PayrollStatus currentStatus, PayrollStatus newStatus) {
        switch (currentStatus) {
            case DRAFT:
                // DRAFT -> CONFIRMED, CANCELLED 허용
                if (newStatus != PayrollStatus.CONFIRMED && newStatus != PayrollStatus.CANCELLED) {
                    throw new InvalidOperationException("작성중 상태에서는 확정 또는 취소 상태로만 변경 가능합니다.");
                }
                break;
            case CONFIRMED:
                // CONFIRMED -> PAID, CANCELLED 허용
                if (newStatus != PayrollStatus.PAID && newStatus != PayrollStatus.CANCELLED) {
                    throw new InvalidOperationException("확정 상태에서는 지급완료 또는 취소 상태로만 변경 가능합니다.");
                }
                break;
            case PAID:
                // PAID -> CANCELLED 허용
                if (newStatus != PayrollStatus.CANCELLED) {
                    throw new InvalidOperationException("지급완료 상태에서는 취소 상태로만 변경 가능합니다.");
                }
                break;
            case CANCELLED:
                // CANCELLED -> 변경 불가
                throw new InvalidOperationException("취소된 급여는 상태를 변경할 수 없습니다.");
        }
    }

    /**
     * 월별 급여 계산 스케줄러
     * 매월 1일 01:00에 실행되어 지난 달의 급여를 계산합니다.
     */
    @Scheduled(cron = "0 0 1 1 * ?")
    @Transactional
    public void calculateMonthlyPayrolls() {
        // 지난 달의 시작일과 종료일 계산
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        LocalDate startDate = previousMonth.atDay(1);
        LocalDate endDate = previousMonth.atEndOfMonth();

        log.info("월별 급여 계산 시작: {} ~ {}", startDate, endDate);

        // 모든 매장 조회
        List<Store> stores = storeRepository.findAll();

        for (Store store : stores) {
            // 매장의 모든 직원 관계 조회
            List<EmployeeStoreRelation> relations = employeeStoreRelationRepository.findByStore(store);

            for (EmployeeStoreRelation relation : relations) {
                try {
                    // 급여 계산
                    calculatePayroll(relation.getEmployeeProfile().getId(), store.getId(), startDate, endDate);
                    log.info("급여 계산 완료: 직원ID={}, 매장ID={}", relation.getEmployeeProfile().getId(), store.getId());
                } catch (Exception e) {
                    log.error("급여 계산 실패: 직원ID={}, 매장ID={}, 오류={}",
                            relation.getEmployeeProfile().getId(), store.getId(), e.getMessage(), e);
                }
            }
        }

        log.info("월별 급여 계산 완료");
    }

}
