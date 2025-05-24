package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.exception.LocationVerificationException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 출퇴근 관리 서비스
 * 직원들의 출근/퇴근 기록을 처리하고 관리하는 비즈니스 로직을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final LocationVerificationService locationService;

    /**
     * 직원 출근 처리 (위치 검증 포함)
     */
    @Transactional
    public Attendance checkInWithVerification(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 위치 검증
        if (!locationService.verifyUserInStore(storeId, latitude, longitude)) {
            throw LocationVerificationException.outOfRange();
        }

        return checkIn(employeeId, storeId, latitude, longitude);
    }

    /**
     * 직원 출근 처리
     */
    @Transactional
    public Attendance checkIn(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile();
        Store store = context.store();

        // 오늘의 출퇴근 기록 조회
        List<Attendance> todayAttendances = getTodayAttendances(employeeProfile);

        // 이미 출근 기록이 있는지 확인
        if (!todayAttendances.isEmpty()) {
            throw new InvalidOperationException("이미 오늘 출근 기록이 있습니다.");
        }

        // 시급 정보 가져오기
        Integer hourlyWage = context.employeeStoreRelation().getAppliedHourlyWage();

        // 새 출근 기록 생성
        Attendance attendance = new Attendance(employeeProfile, store);
        attendance.checkIn(latitude, longitude, hourlyWage);

        return attendanceRepository.save(attendance);
    }

    /**
     * 직원 퇴근 처리 (위치 검증 포함)
     */
    @Transactional
    public Attendance checkOutWithVerification(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 위치 검증 - LocationVerificationService가 GeoUtils를 활용하도록 개선 필요
        if (!locationService.verifyUserInStore(storeId, latitude, longitude)) {
            throw LocationVerificationException.outOfRange();
        }

        return checkOut(employeeId, storeId, latitude, longitude);
    }

    /**
     * 직원 퇴근 처리
     */
    @Transactional
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile();

        // 오늘의 출퇴근 기록 조회 - DateTimeUtils 활용으로 개선 필요
        List<Attendance> todayAttendances = getTodayAttendances(employeeProfile);

        // 출근 기록이 없는지 확인
        if (todayAttendances.isEmpty()) {
            throw new InvalidOperationException("오늘 출근 기록이 없습니다.");
        }

        // 가장 최근 출근 기록 가져오기
        Attendance attendance = todayAttendances.get(0);

        // 퇴근 정보 업데이트
        attendance.checkOut(latitude, longitude);

        return attendanceRepository.save(attendance);
    }

    /**
     * 특정 직원의 특정 기간 출퇴근 기록 조회
     */
    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByEmployeeAndPeriod(
            Long employeeId, LocalDateTime startDate, LocalDateTime endDate) {

        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                employeeProfile, startDate, endDate);
    }

    /**
     * 특정 매장의 특정 기간 출퇴근 기록 조회
     */
    @Transactional(readOnly = true)
    public List<Attendance> getAttendancesByStoreAndPeriod(
            Long storeId, LocalDateTime startDate, LocalDateTime endDate) {

        Store store = getStore(storeId);
        return attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                store, startDate, endDate);
    }

    /**
     * 특정 직원의 특정 월 출퇴근 기록 조회
     */
    @Transactional(readOnly = true)
    public List<Attendance> getMonthlyAttendancesByEmployee(Long employeeId, int year, int month) {
        // DateTimeUtils 활용
        LocalDateTime startOfMonth = DateTimeUtils.getStartOfMonth(year, month);
        LocalDateTime endOfMonth = DateTimeUtils.getEndOfMonth(year, month);

        return getAttendancesByEmployeeAndPeriod(employeeId, startOfMonth, endOfMonth);
    }

    /**
     * 직원 프로필을 조회합니다.
     */
    private EmployeeProfile getEmployeeProfile(Long employeeId) {
        return employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("EmployeeProfile", employeeId));
    }

    /**
     * 매장을 조회합니다.
     */
    private Store getStore(Long storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));
    }

    /**
     * 오늘 날짜의 출퇴근 기록을 조회합니다.
     */
    private List<Attendance> getTodayAttendances(EmployeeProfile employeeProfile) {
        // DateTimeUtils 활용으로 변경
        LocalDateTime startOfDay = DateTimeUtils.getStartOfDay();
        LocalDateTime endOfDay = DateTimeUtils.getEndOfDay();

        return attendanceRepository.findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                employeeProfile, startOfDay, endOfDay);
    }


    /**
     * 직원, 매장, 그리고 그들의 관계 정보를 한 번에 조회합니다.
     */
    private EmployeeStoreRelationContext getEmployeeStoreContext(Long employeeId, Long storeId) {
        EmployeeProfile employeeProfile = getEmployeeProfile(employeeId);
        Store store = getStore(storeId);

        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeProfileAndStore(employeeProfile, store)
                .orElseThrow(() -> new EntityNotFoundException(
                        String.format("사원(ID: %d)-매장(ID: %d) 관계를 찾을 수 없습니다.", employeeId, storeId)));

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