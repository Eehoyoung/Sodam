package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.StoreRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;

    @Transactional
    public Attendance checkIn(Long employeeId, Long storeId, Double latitude, Double longitude) {
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("직원을 찾을 수 없습니다."));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 이미 오늘 출근한 기록이 있는지 확인
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime tomorrow = today.plusDays(1);

        List<Attendance> todayAttendances = attendanceRepository.findByEmployeeAndCheckInTimeBetween(
                employee, today, tomorrow);

        if (!todayAttendances.isEmpty()) {
            throw new IllegalStateException("이미 오늘 출근 기록이 있습니다.");
        }

        // 새 출근 기록 생성
        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setStore(store);
        attendance.setCheckInTime(LocalDateTime.now());
        attendance.setCheckInLatitude(latitude);
        attendance.setCheckInLongitude(longitude);
        attendance.setLocationVerified(true);  // 위치 인증은 이미 컨트롤러에서 수행

        return attendanceRepository.save(attendance);
    }

    @Transactional
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude) {
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("직원을 찾을 수 없습니다."));

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 오늘의 출근 기록 찾기
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime tomorrow = today.plusDays(1);

        List<Attendance> todayAttendances = attendanceRepository.findByEmployeeAndCheckInTimeBetween(
                employee, today, tomorrow);

        if (todayAttendances.isEmpty()) {
            throw new IllegalStateException("오늘 출근 기록이 없습니다.");
        }

        // 가장 최근 출근 기록 가져오기
        Attendance attendance = todayAttendances.get(0);

        if (attendance.getCheckOutTime() != null) {
            throw new IllegalStateException("이미 퇴근 처리가 되었습니다.");
        }

        // 퇴근 정보 업데이트
        attendance.setCheckOutTime(LocalDateTime.now());
        attendance.setCheckOutLatitude(latitude);
        attendance.setCheckOutLongitude(longitude);

        return attendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByEmployeeAndPeriod(
            Long employeeId, LocalDateTime startDate, LocalDateTime endDate) {

        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("직원을 찾을 수 없습니다."));

        return attendanceRepository.findByEmployeeAndCheckInTimeBetween(
                employee, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByStoreAndPeriod(
            Long storeId, LocalDateTime startDate, LocalDateTime endDate) {

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        return attendanceRepository.findByStoreAndCheckInTimeBetween(
                store, startDate, endDate);
    }
}