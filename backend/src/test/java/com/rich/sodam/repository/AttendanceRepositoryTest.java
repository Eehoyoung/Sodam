package com.rich.sodam.repository;

import com.rich.sodam.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AttendanceRepository 테스트 클래스
 * 출퇴근 기록 Repository의 데이터베이스 쿼리 메서드들을 검증합니다.
 * <p>
 * 주의: Mockito 사용 금지 - 실제 데이터베이스를 사용한 통합 테스트로 작성
 */
@DataJpaTest
@ActiveProfiles("test")
class AttendanceRepositoryTest {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;

    private User testUser;
    private EmployeeProfile testEmployee;
    private Store testStore;
    private EmployeeStoreRelation testRelation;

    @BeforeEach
    void setUp() {
        System.out.println("[DEBUG_LOG] AttendanceRepositoryTest 테스트 데이터 초기화 시작");

        // 테스트 사용자 생성
        testUser = new User("attendance@example.com", "출퇴근테스트사용자");
        testUser = userRepository.save(testUser);
        System.out.println("[DEBUG_LOG] 테스트 사용자 생성 완료 - ID: " + testUser.getId());

        // 테스트 직원 프로필 생성
        testEmployee = new EmployeeProfile(testUser);
        testEmployee = employeeProfileRepository.save(testEmployee);
        System.out.println("[DEBUG_LOG] 테스트 직원 프로필 생성 완료 - ID: " + testEmployee.getId());

        // 테스트 매장 생성
        testStore = new Store("출퇴근테스트매장", "5555555555", "02-5555-5555", "레스토랑", 18000, 100);
        testStore.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 789", 100);
        testStore = storeRepository.save(testStore);
        System.out.println("[DEBUG_LOG] 테스트 매장 생성 완료 - ID: " + testStore.getId());

        // 직원-매장 관계 생성
        testRelation = new EmployeeStoreRelation(testEmployee, testStore, 18000);
        testRelation = employeeStoreRelationRepository.save(testRelation);
        System.out.println("[DEBUG_LOG] 직원-매장 관계 생성 완료");
    }

    @Test
    @DisplayName("직원 ID와 기간으로 출퇴근 기록 조회 - 성공")
    void findByEmployeeIdAndPeriodWithDetails_Success() {
        System.out.println("[DEBUG_LOG] 직원 ID와 기간으로 출퇴근 기록 조회 테스트 시작");

        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        Attendance attendance1 = createAttendanceRecord();
        Attendance attendance2 = createAttendanceRecord();

        // When
        List<Attendance> results = attendanceRepository.findByEmployeeIdAndPeriodWithDetails(
                testEmployee.getId(), startDate, endDate);

        // Then
        assertThat(results).hasSize(2);
        assertThat(results).contains(attendance1, attendance2);

        System.out.println("[DEBUG_LOG] 직원 ID와 기간으로 출퇴근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("매장별 특정 날짜 출퇴근 기록 조회 - 성공")
    void findByStoreAndDate_Success() {
        System.out.println("[DEBUG_LOG] 매장별 특정 날짜 출퇴근 기록 조회 테스트 시작");

        // Given
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        Attendance attendance1 = createAttendanceRecord();
        Attendance attendance2 = createAttendanceRecord();

        // When
        List<Attendance> results = attendanceRepository.findByStoreAndDate(testStore, startOfDay, endOfDay);

        // Then
        assertThat(results).hasSize(2);
        assertThat(results).contains(attendance1, attendance2);

        System.out.println("[DEBUG_LOG] 매장별 특정 날짜 출퇴근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("기간별 출퇴근 기록 조회 - 성공")
    void findByEmployeeProfileAndCheckInTimeBetween_Success() {
        System.out.println("[DEBUG_LOG] 기간별 출퇴근 기록 조회 테스트 시작");

        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        Attendance attendance = createAttendanceRecord();

        // When
        List<Attendance> results = attendanceRepository
                .findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        testEmployee, startDate, endDate);

        // Then
        assertThat(results).hasSize(1);
        assertThat(results.get(0)).isEqualTo(attendance);

        System.out.println("[DEBUG_LOG] 기간별 출퇴근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("매장 기간별 출퇴근 기록 조회 - 성공")
    void findByStoreAndCheckInTimeBetween_Success() {
        System.out.println("[DEBUG_LOG] 매장 기간별 출퇴근 기록 조회 테스트 시작");

        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        Attendance attendance = createAttendanceRecord();

        // When
        List<Attendance> results = attendanceRepository
                .findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        testStore, startDate, endDate);

        // Then
        assertThat(results).hasSize(1);
        assertThat(results.get(0)).isEqualTo(attendance);

        System.out.println("[DEBUG_LOG] 매장 기간별 출퇴근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("미완료 출근 기록 조회 - 성공")
    void findIncompleteAttendances_Success() {
        System.out.println("[DEBUG_LOG] 미완료 출근 기록 조회 테스트 시작");

        // Given
        Attendance completeAttendance = createAttendanceRecord(); // 완료된 기록

        // 미완료 기록 생성 (퇴근 처리 안함)
        Attendance incompleteAttendance = new Attendance(testEmployee, testStore);
        incompleteAttendance.checkIn(37.5665, 126.9780, 18000);
        incompleteAttendance = attendanceRepository.save(incompleteAttendance);

        // When
        List<Attendance> results = attendanceRepository.findIncompleteAttendances(testEmployee);

        // Then
        assertThat(results).hasSize(1);
        assertThat(results.get(0)).isEqualTo(incompleteAttendance);
        assertThat(results.get(0).getCheckOutTime()).isNull();

        System.out.println("[DEBUG_LOG] 미완료 출근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("주휴수당 포함 출근 기록 조회 - 성공")
    void findWithWeeklyAllowanceByEmployeeAndStore_Success() {
        System.out.println("[DEBUG_LOG] 주휴수당 포함 출근 기록 조회 테스트 시작");

        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        // 주휴수당이 없는 기록
        createAttendanceRecord();

        // 주휴수당이 있는 기록
        Attendance attendanceWithAllowance = new Attendance(testEmployee, testStore);
        attendanceWithAllowance.checkIn(37.5665, 126.9780, 18000);
        attendanceWithAllowance.checkOut(37.5665, 126.9780);
        attendanceWithAllowance.setWeeklyAllowance(java.math.BigDecimal.valueOf(50000));
        attendanceWithAllowance = attendanceRepository.save(attendanceWithAllowance);

        // When
        List<Attendance> results = attendanceRepository.findWithWeeklyAllowanceByEmployeeAndStore(
                testEmployee.getId(), testStore.getId(), startDate, endDate);

        // Then
        assertThat(results).hasSize(1);
        assertThat(results.get(0)).isEqualTo(attendanceWithAllowance);
        assertThat(results.get(0).getWeeklyAllowance()).isNotNull();

        System.out.println("[DEBUG_LOG] 주휴수당 포함 출근 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("특정 날짜 범위 밖의 기록 조회 - 빈 결과")
    void findByEmployeeProfileAndCheckInTimeBetween_OutOfRange() {
        System.out.println("[DEBUG_LOG] 특정 날짜 범위 밖의 기록 조회 테스트 시작");

        // Given
        createAttendanceRecord(); // 현재 시간에 기록 생성

        // 과거 날짜 범위로 조회
        LocalDateTime startDate = LocalDateTime.now().minusDays(10);
        LocalDateTime endDate = LocalDateTime.now().minusDays(5);

        // When
        List<Attendance> results = attendanceRepository
                .findByEmployeeProfileAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                        testEmployee, startDate, endDate);

        // Then
        assertThat(results).isEmpty();

        System.out.println("[DEBUG_LOG] 특정 날짜 범위 밖의 기록 조회 성공 - 기록 수: " + results.size());
    }

    @Test
    @DisplayName("출퇴근 기록 저장 및 조회 - 성공")
    void saveAndFind_Success() {
        System.out.println("[DEBUG_LOG] 출퇴근 기록 저장 및 조회 테스트 시작");

        // Given
        Attendance attendance = new Attendance(testEmployee, testStore);
        attendance.checkIn(37.5665, 126.9780, 18000);

        // When
        Attendance savedAttendance = attendanceRepository.save(attendance);
        Attendance foundAttendance = attendanceRepository.findById(savedAttendance.getId()).orElse(null);

        // Then
        assertThat(foundAttendance).isNotNull();
        assertThat(foundAttendance.getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());
        assertThat(foundAttendance.getStore().getId()).isEqualTo(testStore.getId());
        assertThat(foundAttendance.getCheckInTime()).isNotNull();
        assertThat(foundAttendance.getCheckInLatitude()).isEqualTo(37.5665);
        assertThat(foundAttendance.getCheckInLongitude()).isEqualTo(126.9780);
        assertThat(foundAttendance.getAppliedHourlyWage()).isEqualTo(18000);

        System.out.println("[DEBUG_LOG] 출퇴근 기록 저장 및 조회 성공 - ID: " + foundAttendance.getId());
    }

    /**
     * 테스트용 출퇴근 기록 생성 헬퍼 메서드
     */
    private Attendance createAttendanceRecord() {
        Attendance attendance = new Attendance(testEmployee, testStore);
        attendance.checkIn(37.5665, 126.9780, 18000);
        attendance.checkOut(37.5665, 126.9780);
        return attendanceRepository.save(attendance);
    }
}
