package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PayrollService 테스트 클래스
 * 급여 계산 서비스의 핵심 비즈니스 로직을 검증합니다.
 * <p>
 * 주의: Mockito 사용 금지 - 실제 컴포넌트를 사용한 통합 테스트로 작성
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollServiceTest {

    @Autowired
    private PayrollService payrollService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    private User testUser;
    private EmployeeProfile testEmployee;
    private Store testStore;
    private EmployeeStoreRelation testRelation;

    @BeforeEach
    void setUp() {
        System.out.println("[DEBUG_LOG] PayrollServiceTest 테스트 데이터 초기화 시작");

        // 테스트 사용자 생성
        testUser = new User("payroll@example.com", "급여테스트사용자");
        testUser = userRepository.save(testUser);
        System.out.println("[DEBUG_LOG] 테스트 사용자 생성 완료 - ID: " + testUser.getId());

        // 테스트 직원 프로필 생성
        testEmployee = new EmployeeProfile(testUser);
        testEmployee = employeeProfileRepository.save(testEmployee);
        System.out.println("[DEBUG_LOG] 테스트 직원 프로필 생성 완료 - ID: " + testEmployee.getId());

        // 테스트 매장 생성
        testStore = new Store("급여테스트매장", "9876543210", "02-9876-5432", "카페", 15000, 100);
        testStore.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 456", 100);
        testStore = storeRepository.save(testStore);
        System.out.println("[DEBUG_LOG] 테스트 매장 생성 완료 - ID: " + testStore.getId());

        // 직원-매장 관계 생성 (시급 15,000원)
        testRelation = new EmployeeStoreRelation(testEmployee, testStore, 15000);
        testRelation = employeeStoreRelationRepository.save(testRelation);
        System.out.println("[DEBUG_LOG] 직원-매장 관계 생성 완료 - 시급: " + testRelation.getAppliedHourlyWage());
    }

    @Test
    @DisplayName("월별 급여 계산 - 성공")
    void calculateMonthlyWage_Success() {
        System.out.println("[DEBUG_LOG] 월별 급여 계산 테스트 시작");

        // Given
        LocalDateTime now = LocalDateTime.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        // 출퇴근 기록 생성 (8시간 근무)
        createAttendanceRecord(8);

        // When
        int result = payrollService.calculateMonthlyWage(
                testEmployee.getId(), testStore.getId(), year, month);

        // Then
        assertThat(result).isGreaterThan(0);
        System.out.println("[DEBUG_LOG] 월별 급여 계산 성공 - 총 급여: " + result);
    }

    @Test
    @DisplayName("기간별 급여 계산 - 성공")
    void calculateWageForPeriod_Success() {
        System.out.println("[DEBUG_LOG] 기간별 급여 계산 테스트 시작");

        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();

        // 출퇴근 기록 생성
        createAttendanceRecord(8);

        // When
        int result = payrollService.calculateWageForPeriod(
                testEmployee.getId(), testStore.getId(), startDate, endDate);

        // Then
        assertThat(result).isGreaterThan(0);
        System.out.println("[DEBUG_LOG] 기간별 급여 계산 성공 - 총 급여: " + result);
    }

    @Test
    @DisplayName("직원 급여 정보 조회 - 성공")
    void getEmployeeWageInfoInAllStores_Success() {
        System.out.println("[DEBUG_LOG] 직원 급여 정보 조회 테스트 시작");

        // When
        List<EmployeeWageInfoDto> results = payrollService.getEmployeeWageInfoInAllStores(testEmployee.getId());

        // Then
        assertThat(results).isNotEmpty();
        assertThat(results.get(0).getEmployeeId()).isEqualTo(testEmployee.getId());
        assertThat(results.get(0).getStoreId()).isEqualTo(testStore.getId());
        assertThat(results.get(0).getAppliedHourlyWage()).isEqualTo(15000);

        System.out.println("[DEBUG_LOG] 직원 급여 정보 조회 성공 - 매장 수: " + results.size());
    }

    @Test
    @DisplayName("존재하지 않는 직원으로 급여 계산 시도 - 실패")
    void calculateWage_NonExistentEmployee() {
        System.out.println("[DEBUG_LOG] 존재하지 않는 직원 급여 계산 테스트 시작");

        // Given
        Long nonExistentEmployeeId = 99999L;
        LocalDateTime now = LocalDateTime.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        // When & Then
        assertThatThrownBy(() -> payrollService.calculateMonthlyWage(
                nonExistentEmployeeId, testStore.getId(), year, month))
                .isInstanceOf(EntityNotFoundException.class);

        System.out.println("[DEBUG_LOG] 존재하지 않는 직원 급여 계산 실패 테스트 완료");
    }

    @Test
    @DisplayName("존재하지 않는 매장으로 급여 계산 시도 - 실패")
    void calculateWage_NonExistentStore() {
        System.out.println("[DEBUG_LOG] 존재하지 않는 매장 급여 계산 테스트 시작");

        // Given
        Long nonExistentStoreId = 99999L;
        LocalDateTime now = LocalDateTime.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        // When & Then
        assertThatThrownBy(() -> payrollService.calculateMonthlyWage(
                testEmployee.getId(), nonExistentStoreId, year, month))
                .isInstanceOf(EntityNotFoundException.class);

        System.out.println("[DEBUG_LOG] 존재하지 않는 매장 급여 계산 실패 테스트 완료");
    }

    @Test
    @DisplayName("근무 기록이 없는 월의 급여 계산 - 성공")
    void calculateWage_NoWorkingRecords() {
        System.out.println("[DEBUG_LOG] 근무 기록이 없는 월의 급여 계산 테스트 시작");

        // Given
        LocalDateTime pastDate = LocalDateTime.now().minusMonths(6);
        int year = pastDate.getYear();
        int month = pastDate.getMonthValue();

        // When
        int result = payrollService.calculateMonthlyWage(
                testEmployee.getId(), testStore.getId(), year, month);

        // Then
        assertThat(result).isEqualTo(0);

        System.out.println("[DEBUG_LOG] 근무 기록이 없는 월의 급여 계산 성공 - 총 급여: " + result);
    }

    @Test
    @DisplayName("여러 직원의 급여 정보 조회 - 성공")
    void getEmployeeWageInfo_MultipleEmployees() {
        System.out.println("[DEBUG_LOG] 여러 직원의 급여 정보 조회 테스트 시작");

        // Given
        User anotherUser = new User("another@example.com", "다른사용자");
        anotherUser = userRepository.save(anotherUser);
        EmployeeProfile anotherEmployee = new EmployeeProfile(anotherUser);
        anotherEmployee = employeeProfileRepository.save(anotherEmployee);

        // 다른 매장 생성
        Store anotherStore = new Store("다른매장", "1111111111", "02-1111-1111", "편의점", 12000, 100);
        anotherStore = storeRepository.save(anotherStore);

        // 다른 직원-매장 관계 생성
        EmployeeStoreRelation anotherRelation = new EmployeeStoreRelation(anotherEmployee, anotherStore, 12000);
        employeeStoreRelationRepository.save(anotherRelation);

        // When
        List<EmployeeWageInfoDto> firstEmployeeResults = payrollService.getEmployeeWageInfoInAllStores(testEmployee.getId());
        List<EmployeeWageInfoDto> secondEmployeeResults = payrollService.getEmployeeWageInfoInAllStores(anotherEmployee.getId());

        // Then
        assertThat(firstEmployeeResults).hasSize(1);
        assertThat(firstEmployeeResults.get(0).getAppliedHourlyWage()).isEqualTo(15000);

        assertThat(secondEmployeeResults).hasSize(1);
        assertThat(secondEmployeeResults.get(0).getAppliedHourlyWage()).isEqualTo(12000);

        System.out.println("[DEBUG_LOG] 여러 직원의 급여 정보 조회 성공");
    }

    /**
     * 테스트용 출근 기록 생성 헬퍼 메서드
     */
    private Attendance createAttendanceRecord(int workingHours) {
        Attendance attendance = new Attendance(testEmployee, testStore);

        // 출근 처리
        attendance.checkIn(37.5665, 126.9780, testRelation.getAppliedHourlyWage());
        attendance = attendanceRepository.save(attendance);

        // 퇴근 처리
        attendance.checkOut(37.5665, 126.9780);

        return attendanceRepository.save(attendance);
    }
}
