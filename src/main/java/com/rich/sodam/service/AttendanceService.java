package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
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
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;

    @Transactional
    public Attendance checkIn(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile;
        Store store = context.store;

        // 오늘의 출퇴근 기록 조회
        List<Attendance> todayAttendances = getTodayAttendances(employeeProfile);

        // 이미 출근 기록이 있는지 확인
        if (!todayAttendances.isEmpty()) {
            throw new IllegalStateException("이미 오늘 출근 기록이 있습니다.");
        }

        // 시급 정보 가져오기
        Integer hourlyWage = context.employeeStoreRelation.getAppliedHourlyWage();

        // 새 출근 기록 생성
        Attendance attendance = new Attendance(employeeProfile, store);
        attendance.checkIn(latitude, longitude, hourlyWage);

        return attendanceRepository.save(attendance);
    }

    @Transactional
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile;

        // 오늘의 출퇴근 기록 조회
        List<Attendance> todayAttendances = getTodayAttendances(employeeProfile);

        // 출근 기록이 없는지 확인
        if (todayAttendances.isEmpty()) {
            throw new IllegalStateException("오늘 출근 기록이 없습니다.");
        }

        // 가장 최근 출근 기록 가져오기
        Attendance attendance = todayAttendances.get(0);

        // 이미 퇴근 처리가 되었는지 확인
        if (attendance.getCheckOutTime() != null) {
            throw new IllegalStateException("이미 퇴근 처리가 되었습니다.");
        }

        // 퇴근 정보 업데이트
        attendance.checkOut(latitude, longitude);

        return attendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByEmployeeAndPeriod(
            Long employeeId, LocalDateTime startDate, LocalDateTime endDate) {

        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetween(
                employeeProfile, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByStoreAndPeriod(
            Long storeId, LocalDateTime startDate, LocalDateTime endDate) {

        Store store = getStore(storeId);
        return attendanceRepository.findByStoreAndCheckInTimeBetween(
                store, startDate, endDate);
    }

    // 중복 코드 분리를 위한 비공개 도우미 메소드들

    /**
     * 직원 프로필을 조회합니다.
     */
    private EmployeeProfile getEmployeeProfile(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("직원을 찾을 수 없습니다."));
    }

    /**
     * 매장을 조회합니다.
     */
    private Store getStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
    }

    /**
     * 오늘 날짜의 출퇴근 기록을 조회합니다.
     */
    private List<Attendance> getTodayAttendances(EmployeeProfile employeeProfile) {
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime tomorrow = today.plusDays(1);

        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetween(
                employeeProfile, today, tomorrow);
    }

    /**
     * 직원, 매장, 그리고 그들의 관계 정보를 한 번에 조회합니다.
     */
    private EmployeeStoreRelationContext getEmployeeStoreContext(Long employeeId, Long storeId) {
        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        Store store = getStore(storeId);

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException("사원-매장 관계를 찾을 수 없습니다."));

        return new EmployeeStoreRelationContext(employeeProfile, store, relation);
    }

    /**
     * 직원, 매장, 그리고 그들의 관계 정보를 담는 내부 클래스
     */
    private record EmployeeStoreRelationContext(
            EmployeeProfile employeeProfile,
            Store store,
            EmployeeStoreRelation employeeStoreRelation) {
    }
}