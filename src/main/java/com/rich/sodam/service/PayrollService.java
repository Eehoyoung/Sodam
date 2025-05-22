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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

}