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
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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

    @Transactional(readOnly = true)
    public int calculateEmployeeWage(Long employeeId, Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        // 해당 기간 내 근무 기록 조회
        List<Attendance> attendances = attendanceRepository
                .findByEmployeeProfileAndStoreAndCheckInTimeBetween(
                        employeeProfile, store, startDate, endDate);

        // 총 근무 시간 계산 (분 단위)
        long totalMinutes = 0;
        for (Attendance attendance : attendances) {
            if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() != null) {
                Duration duration = Duration.between(attendance.getCheckInTime(), attendance.getCheckOutTime());
                totalMinutes += duration.toMinutes();
            }
        }

        // 시간으로 변환 (분 / 60)
        double totalHours = totalMinutes / 60.0;

        // 시급 계산
        int hourlyWage = relation.getAppliedHourlyWage();

        // 총 급여 계산 및 반환
        return (int) Math.round(totalHours * hourlyWage);
    }

    @Transactional(readOnly = true)
    public List<EmployeeWageInfoDto> getEmployeeWageInfoInAllStores(Long employeeId) {
        EmployeeProfile employeeProfile = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("사원 프로필을 찾을 수 없습니다."));

        List<EmployeeStoreRelation> relations = employeeStoreRelationRepository
                .findByEmployeeProfile(employeeProfile);

        List<EmployeeWageInfoDto> result = new ArrayList<>();

        for (EmployeeStoreRelation relation : relations) {
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

            result.add(dto);
        }

        return result;
    }
}