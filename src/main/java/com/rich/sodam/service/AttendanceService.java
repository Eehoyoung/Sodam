package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.request.ManualAttendanceRequestDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.exception.LocationVerificationException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
    private final UserService userService;

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
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
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
        // 위치 검증
        if (!locationService.verifyUserInStore(storeId, latitude, longitude)) {
            throw LocationVerificationException.outOfRange();
        }

        return checkOut(employeeId, storeId, latitude, longitude);
    }

    /**
     * 직원 퇴근 처리
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance checkOut(Long employeeId, Long storeId, Double latitude, Double longitude) {
        // 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(employeeId, storeId);
        EmployeeProfile employeeProfile = context.employeeProfile();

        // 오늘의 출퇴근 기록 조회
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
    @Cacheable(value = "attendance", key = "'employee:' + #employeeId + ':' + #startDate.toString() + ':' + #endDate.toString()")
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
    @Cacheable(value = "attendance", key = "'store:' + #storeId + ':' + #startDate.toString() + ':' + #endDate.toString()")
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
     * 수동 출퇴근 등록
     * ATTEND-004: 사업주가 직원 대신 출퇴근 기록을 수동으로 등록
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "attendance", allEntries = true)
    })
    public Attendance registerManualAttendance(ManualAttendanceRequestDto request) {
        // 1. 사업주 권한 검증
        userService.validateMasterPermission(request.getRegisteredBy());

        // 2. 직원과 매장 조회
        EmployeeStoreRelationContext context = getEmployeeStoreContext(
                request.getEmployeeId(), request.getStoreId());

        // 3. 해당 날짜의 기존 출퇴근 기록 확인
        validateNoDuplicateAttendance(context.employeeProfile(), request.getCheckInTime());

        // 4. 출퇴근 기록 생성
        Attendance attendance = createManualAttendance(context, request);

        return attendanceRepository.save(attendance);
    }

    /**
     * 해당 날짜에 중복된 출퇴근 기록이 있는지 검증
     */
    private void validateNoDuplicateAttendance(EmployeeProfile employeeProfile, LocalDateTime checkInTime) {
        LocalDateTime startOfDay = checkInTime.toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = checkInTime.toLocalDate().atTime(23, 59, 59);

        List<Attendance> existingAttendances = attendanceRepository
                .findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        employeeProfile, startOfDay, endOfDay);

        if (!existingAttendances.isEmpty()) {
            throw new InvalidOperationException(
                    String.format("해당 날짜(%s)에 이미 출퇴근 기록이 존재합니다.",
                            checkInTime.toLocalDate()));
        }
    }

    /**
     * 수동 출퇴근 기록 생성
     */
    private Attendance createManualAttendance(EmployeeStoreRelationContext context,
                                              ManualAttendanceRequestDto request) {
        // 시급 정보 가져오기
        Integer hourlyWage = context.employeeStoreRelation().getAppliedHourlyWage();

        // 새 출퇴근 기록 생성
        Attendance attendance = new Attendance(context.employeeProfile(), context.store());

        // 수동 출근 처리 (위치 정보는 null로 설정)
        attendance.manualCheckIn(request.getCheckInTime(), null, null, hourlyWage);

        // 퇴근 시간이 있는 경우 수동 퇴근 처리
        if (request.getCheckOutTime() != null) {
            attendance.manualCheckOut(request.getCheckOutTime(), null, null);
        }

        return attendance;
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
     * Fetch Join을 사용하여 N+1 쿼리 문제를 해결합니다.
     */
    private EmployeeStoreRelationContext getEmployeeStoreContext(Long employeeId, Long storeId) {
        EmployeeStoreRelation relation = employeeStoreRelationRepository
                .findByEmployeeIdAndStoreIdWithDetails(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException(
                        String.format("사원(ID: %d)-매장(ID: %d) 관계를 찾을 수 없습니다.", employeeId, storeId)));

        return new EmployeeStoreRelationContext(
                relation.getEmployeeProfile(),
                relation.getStore(),
                relation);
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
