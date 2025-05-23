package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.EmployeeWageInfoDto;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.util.DateTimeUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.hibernate.ObjectNotFoundException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PayrollService {
    private final AttendanceRepository attendanceRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;

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
        BigDecimal avgDailyWage = BigDecimal.valueOf(totalWage).divide(BigDecimal.valueOf(workDays), 2, BigDecimal.ROUND_HALF_UP);

        // 주휴수당 = 평균 일급의 1/5
        return avgDailyWage.multiply(BigDecimal.valueOf(0.2)).setScale(0, BigDecimal.ROUND_HALF_UP);
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
                .filter(date -> date != null) // null이 아닌 입사일만 필터링
                .min(LocalDate::compareTo) // 가장 빠른 날짜 찾기
                .orElseGet(() ->
                        // 입사일이 없는 경우 사용자 생성일 또는 현재 날짜 사용
                        employee.getUser().getCreatedAt() != null ?
                                employee.getUser().getCreatedAt().toLocalDate() : LocalDate.now()
                );
    }

}