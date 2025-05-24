package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.dto.request.PayrollCalculationRequestDto;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.repository.*;
import com.rich.sodam.util.DateTimeUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.ObjectNotFoundException;
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

    /**
     * 특정 기간의 급여 계산
     */
    @Transactional(readOnly = true)
    public int calculateWageForPeriod(Long employeeId, Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        // 직원-매장 관계 및 출근 기록 확인
        validateEmployeeStoreRelation(employeeId, storeId);

        // 해당 기간의 근무 기록 조회
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetweenOrderByCheckInTimeDesc(
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

        // 해당 월의 근무 기록 조회
        List<Attendance> monthlyAttendances = attendanceRepository
                .findByEmployeeProfile_IdAndCheckInTimeBetweenOrderByCheckInTimeDesc(
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

        return dto;
    }

    /**
     * 주휴 수당을 계산하는 스케줄러
     * 매일 23:40에 실행됩니다.
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

        // 주휴수당 계산 - 평균 일급의 1/5
        BigDecimal weeklyAllowance = calculateWeeklyAllowance(attendances, weeklyHours);

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

        return attendanceRepository.findByEmployeeIdAndCheckInTimeBetween(
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
     * 주휴수당 계산
     * 주간 평균 일급의 1/5를 계산
     */
    private BigDecimal calculateWeeklyAllowance(List<Attendance> attendances, BigDecimal weeklyHours) {
        // 총 임금 계산
        int totalWage = 0;
        for (Attendance attendance : attendances) {
            if (attendance.getCheckOutTime() != null) {
                totalWage += attendance.calculateDailyWage();
            }
        }

        // 근무일수
        int workDays = attendances.size();
        if (workDays == 0) return BigDecimal.ZERO;

        // 평균 일급
        BigDecimal avgDailyWage = BigDecimal.valueOf(totalWage).divide(BigDecimal.valueOf(workDays), 2, RoundingMode.HALF_UP);

        // 주휴수당 = 평균 일급의 1/5
        return avgDailyWage.multiply(BigDecimal.valueOf(0.2)).setScale(0, RoundingMode.HALF_UP);
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
        // 마지막 출근기록 찾기
        List<Attendance> recentAttendances = attendanceRepository.findByEmployeeProfile_IdAndCheckInTimeBetweenOrderByCheckInTimeDesc(
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

        // 해당 기간의 출근 기록 조회
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        employeeId, storeId,
                        startDate.atStartOfDay(),
                        endDate.atTime(23, 59, 59));

        // 적용 시급 계산
        int hourlyWage = relation.getAppliedHourlyWage();

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
        int totalRegularWage = 0;
        int totalOvertimeWage = 0;
        int totalNightWorkWage = 0;

        // 급여 상세 내역 생성 및 계산
        List<PayrollDetail> details = new ArrayList<>();

        for (Attendance attendance : attendances) {
            if (attendance.getCheckOutTime() == null) continue;

            // 근무 시간 계산
            LocalTime startTime = attendance.getCheckInTime().toLocalTime();
            LocalTime endTime = attendance.getCheckOutTime().toLocalTime();
            LocalDate workDate = attendance.getCheckInTime().toLocalDate();

            // 근무 시간 분리 (기본/초과)
            Map<String, Double> workHours = splitWorkingHours(startTime, endTime, policy.getRegularHoursPerDay());
            double regularHours = workHours.get("regularHours");
            double overtimeHours = workHours.get("overtimeHours");

            // 야간 근무 시간 계산
            double nightWorkHours = calculateNightWorkHours(startTime, endTime, policy.getNightWorkStartTime());

            // 급여 계산
            int regularWage = calculateRegularWage(hourlyWage, regularHours);
            int overtimeWage = calculateOvertimeWage(hourlyWage, overtimeHours, policy.getOvertimeRate());
            int nightWorkWage = calculateNightWorkWage(hourlyWage, nightWorkHours, policy.getNightWorkRate());
            int dailyWage = regularWage + overtimeWage + nightWorkWage;

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
            detail.setBaseHourlyWage(hourlyWage);
            detail.setRegularWage(regularWage);
            detail.setOvertimeWage(overtimeWage);
            detail.setNightWorkWage(nightWorkWage);
            detail.setDailyWage(dailyWage);

            details.add(detail);

            // 합계 누적
            totalRegularHours += regularHours;
            totalOvertimeHours += overtimeHours;
            totalNightWorkHours += nightWorkHours;
            totalRegularWage += regularWage;
            totalOvertimeWage += overtimeWage;
            totalNightWorkWage += nightWorkWage;
        }

        // 주휴수당 계산
        int weeklyAllowance = 0;
        if (policy.getWeeklyAllowanceEnabled()) {
            weeklyAllowance = calculateTotalWeeklyAllowance(employeeId, storeId, startDate, endDate);
        }

        // 총 급여 계산
        int grossWage = totalRegularWage + totalOvertimeWage + totalNightWorkWage + weeklyAllowance;

        // 세금 계산
        int taxAmount = calculateTax(grossWage, policy.getTaxPolicyType());

        // 실수령액 계산
        int netWage = grossWage - taxAmount;

        // 급여 정보 설정
        payroll.setRegularHours(totalRegularHours);
        payroll.setOvertimeHours(totalOvertimeHours);
        payroll.setNightWorkHours(totalNightWorkHours);
        payroll.setRegularWage(totalRegularWage);
        payroll.setOvertimeWage(totalOvertimeWage);
        payroll.setNightWorkWage(totalNightWorkWage);
        payroll.setWeeklyAllowance(weeklyAllowance);
        payroll.setGrossWage(grossWage);
        payroll.setTaxRate(policy.getTaxPolicyType() == TaxPolicyType.INCOME_TAX_3_3 ? 0.033 : 0.0916);
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

        return savedPayroll;
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

        return payrollRepository.save(payroll);
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
     * 주휴수당을 급여에 통합
     */
    private int calculateTotalWeeklyAllowance(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate) {
        // 해당 기간의 출근 기록 중 주휴수당이 설정된 기록 조회
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeProfile_IdAndStore_IdAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        employeeId, storeId, startDate.atStartOfDay(), endDate.atTime(23, 59, 59));

        // 주휴수당 합계 계산
        return attendances.stream()
                .filter(a -> a.getWeeklyAllowance() != null)
                .mapToInt(a -> a.getWeeklyAllowance().intValue())
                .sum();
    }

    /**
     * 세금 계산
     */
    private int calculateTax(int grossWage, TaxPolicyType taxPolicyType) {
        switch (taxPolicyType) {
            case INCOME_TAX_3_3:
                // 3.3% 원천징수세 계산
                return (int) Math.round(grossWage * 0.033);
            case FOUR_INSURANCES:
                // 4대보험 계산 (국민연금 4.5%, 건강보험 3.495%, 장기요양보험 0.378%, 고용보험 0.9%)
                double pensionRate = 0.045;      // 국민연금
                double healthRate = 0.03495;     // 건강보험
                double longTermCareRate = 0.00378; // 장기요양보험
                double employmentRate = 0.009;   // 고용보험

                int pension = (int) Math.round(grossWage * pensionRate);
                int health = (int) Math.round(grossWage * healthRate);
                int longTermCare = (int) Math.round(grossWage * longTermCareRate);
                int employment = (int) Math.round(grossWage * employmentRate);

                return pension + health + longTermCare + employment;
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

    /**
     * 기본 근무 시급 계산
     */
    private int calculateRegularWage(int hourlyWage, double workHours) {
        return (int) Math.round(hourlyWage * workHours);
    }

    /**
     * 초과근무 수당 계산
     */
    private int calculateOvertimeWage(int hourlyWage, double overtimeHours, double overtimeRate) {
        return (int) Math.round(hourlyWage * overtimeHours * overtimeRate);
    }

    /**
     * 야간 근무 시간 계산
     */
    private double calculateNightWorkHours(LocalTime startTime, LocalTime endTime, LocalTime nightWorkStartTime) {
        // 종료 시간이 시작 시간보다 이전인 경우 (날짜가 넘어간 경우)
        LocalTime adjustedEndTime = endTime;
        boolean isNextDay = false;

        if (endTime.isBefore(startTime)) {
            adjustedEndTime = endTime.plusHours(24);
            isNextDay = true;
        }

        // 야간 근무 종료 시간 (다음날 6시)
        LocalTime nightWorkEndTime = LocalTime.of(6, 0);
        if (!isNextDay) {
            nightWorkEndTime = nightWorkEndTime.plusHours(24);
        }

        // 야간 근무 시작 시간이 근무 시간 이후인 경우
        if (nightWorkStartTime.isAfter(adjustedEndTime)) {
            return 0;
        }

        // 야간 근무 시작 시간이 근무 시간 이전인 경우
        LocalTime effectiveStartTime = startTime.isBefore(nightWorkStartTime) ? nightWorkStartTime : startTime;

        // 야간 근무 종료 시간 조정 (다음날 6시 이후까지 근무하는 경우)
        LocalTime effectiveEndTime = adjustedEndTime.isAfter(nightWorkEndTime) ? nightWorkEndTime : adjustedEndTime;

        // 야간 근무 시간 계산
        double nightHours = (effectiveEndTime.toSecondOfDay() - effectiveStartTime.toSecondOfDay()) / 3600.0;

        // 음수가 나오면 0으로 처리
        return Math.max(0, Math.round(nightHours * 100) / 100.0);
    }

    /**
     * 야간 근무 수당 계산
     */
    private int calculateNightWorkWage(int hourlyWage, double nightWorkHours, double nightWorkRate) {
        return (int) Math.round(hourlyWage * nightWorkHours * nightWorkRate);
    }

    /**
     * 근무 시간을 기본/초과 시간으로 분리
     */
    private Map<String, Double> splitWorkingHours(LocalTime startTime, LocalTime endTime, double regularHoursLimit) {
        Map<String, Double> result = new HashMap<>();

        // 종료 시간이 시작 시간보다 이전인 경우 (날짜가 넘어간 경우)
        LocalTime adjustedEndTime = endTime;
        if (endTime.isBefore(startTime)) {
            adjustedEndTime = endTime.plusHours(24);
        }

        // 전체 근무 시간 계산 (시간 단위, 소수점 2자리까지)
        double totalHours = (adjustedEndTime.toSecondOfDay() - startTime.toSecondOfDay()) / 3600.0;
        totalHours = Math.round(totalHours * 100) / 100.0;

        // 기본 근무 시간과 초과 근무 시간 분리
        double regularHours = Math.min(totalHours, regularHoursLimit);
        double overtimeHours = Math.max(0, totalHours - regularHoursLimit);

        result.put("regularHours", regularHours);
        result.put("overtimeHours", overtimeHours);

        return result;
    }

}