package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.ManualAttendanceRequestDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.exception.LocationVerificationException;
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
 * AttendanceService 테스트 클래스
 * 출퇴근 관리 서비스의 핵심 비즈니스 로직을 검증합니다.
 * <p>
 * 주의: Mockito 사용 금지 - 실제 컴포넌트를 사용한 통합 테스트로 작성
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceTest {

    @Autowired
    private AttendanceService attendanceService;

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
    private User testMaster; // 사업주 권한 사용자
    private EmployeeProfile testEmployee;
    private Store testStore;
    private EmployeeStoreRelation testRelation;

    @BeforeEach
    void setUp() {
        System.out.println("[DEBUG_LOG] AttendanceServiceTest 테스트 데이터 초기화 시작");

        // 테스트 사용자 생성
        testUser = new User("test@example.com", "테스트사용자");
        testUser = userRepository.save(testUser);
        System.out.println("[DEBUG_LOG] 테스트 사용자 생성 완료 - ID: " + testUser.getId());

        // 사업주 권한 테스트 사용자 생성
        testMaster = new User("master@example.com", "테스트사업주");
        testMaster.setUserGrade(UserGrade.MASTER);
        testMaster = userRepository.save(testMaster);
        System.out.println("[DEBUG_LOG] 테스트 사업주 생성 완료 - ID: " + testMaster.getId());

        // 테스트 직원 프로필 생성
        testEmployee = new EmployeeProfile(testUser);
        testEmployee = employeeProfileRepository.save(testEmployee);
        System.out.println("[DEBUG_LOG] 테스트 직원 프로필 생성 완료 - ID: " + testEmployee.getId());

        // 테스트 매장 생성 (서울 강남구 좌표)
        testStore = new Store("테스트매장", "1234567890", "02-1234-5678", "음식점", 10000, 100);
        testStore.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 123", 100);
        testStore = storeRepository.save(testStore);
        System.out.println("[DEBUG_LOG] 테스트 매장 생성 완료 - ID: " + testStore.getId());

        // 직원-매장 관계 생성
        testRelation = new EmployeeStoreRelation(testEmployee, testStore, 12000);
        testRelation = employeeStoreRelationRepository.save(testRelation);
        System.out.println("[DEBUG_LOG] 직원-매장 관계 생성 완료 - ID: " + testRelation.getId());
    }

    @Test
    @DisplayName("정상적인 출근 처리 - 성공")
    void checkIn_Success() {
        System.out.println("[DEBUG_LOG] 정상적인 출근 처리 테스트 시작");

        // Given
        Double latitude = 37.5665; // 매장 위치와 동일
        Double longitude = 126.9780;

        // When
        Attendance result = attendanceService.checkIn(
                testEmployee.getId(), testStore.getId(), latitude, longitude);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());
        assertThat(result.getStore().getId()).isEqualTo(testStore.getId());
        assertThat(result.getCheckInTime()).isNotNull();
        assertThat(result.getCheckInLatitude()).isEqualTo(latitude);
        assertThat(result.getCheckInLongitude()).isEqualTo(longitude);
        assertThat(result.getAppliedHourlyWage()).isEqualTo(12000);

        System.out.println("[DEBUG_LOG] 출근 처리 성공 - 출근 시간: " + result.getCheckInTime());
    }

    @Test
    @DisplayName("위치 검증 포함 출근 처리 - 성공")
    void checkInWithVerification_Success() {
        System.out.println("[DEBUG_LOG] 위치 검증 포함 출근 처리 테스트 시작");

        // Given
        Double latitude = 37.5665; // 매장 위치와 동일 (반경 내)
        Double longitude = 126.9780;

        // When
        Attendance result = attendanceService.checkInWithVerification(
                testEmployee.getId(), testStore.getId(), latitude, longitude);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCheckInTime()).isNotNull();

        System.out.println("[DEBUG_LOG] 위치 검증 포함 출근 처리 성공");
    }

    @Test
    @DisplayName("위치 검증 실패 - 매장 반경 밖에서 출근 시도")
    void checkInWithVerification_LocationOutOfRange() {
        System.out.println("[DEBUG_LOG] 위치 검증 실패 테스트 시작");

        // Given
        Double latitude = 37.5000; // 매장에서 멀리 떨어진 위치
        Double longitude = 126.9000;

        // When & Then
        assertThatThrownBy(() -> attendanceService.checkInWithVerification(
                testEmployee.getId(), testStore.getId(), latitude, longitude))
                .isInstanceOf(LocationVerificationException.class);

        System.out.println("[DEBUG_LOG] 위치 검증 실패 테스트 완료");
    }

    @Test
    @DisplayName("중복 출근 처리 시도 - 실패")
    void checkIn_DuplicateCheckIn() {
        System.out.println("[DEBUG_LOG] 중복 출근 처리 테스트 시작");

        // Given
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // 첫 번째 출근 처리
        attendanceService.checkIn(testEmployee.getId(), testStore.getId(), latitude, longitude);

        // When & Then
        assertThatThrownBy(() -> attendanceService.checkIn(
                testEmployee.getId(), testStore.getId(), latitude, longitude))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("이미 오늘 출근 기록이 있습니다");

        System.out.println("[DEBUG_LOG] 중복 출근 처리 실패 테스트 완료");
    }

    @Test
    @DisplayName("정상적인 퇴근 처리 - 성공")
    void checkOut_Success() {
        System.out.println("[DEBUG_LOG] 정상적인 퇴근 처리 테스트 시작");

        // Given
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // 먼저 출근 처리
        Attendance attendance = attendanceService.checkIn(
                testEmployee.getId(), testStore.getId(), latitude, longitude);

        // When
        Attendance result = attendanceService.checkOut(
                testEmployee.getId(), testStore.getId(), latitude, longitude);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(attendance.getId());
        assertThat(result.getCheckOutTime()).isNotNull();
        assertThat(result.getCheckOutLatitude()).isEqualTo(latitude);
        assertThat(result.getCheckOutLongitude()).isEqualTo(longitude);

        System.out.println("[DEBUG_LOG] 퇴근 처리 성공 - 퇴근 시간: " + result.getCheckOutTime());
    }

    @Test
    @DisplayName("출근 기록 없이 퇴근 시도 - 실패")
    void checkOut_NoCheckInRecord() {
        System.out.println("[DEBUG_LOG] 출근 기록 없이 퇴근 시도 테스트 시작");

        // Given
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // When & Then
        assertThatThrownBy(() -> attendanceService.checkOut(
                testEmployee.getId(), testStore.getId(), latitude, longitude))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("오늘 출근 기록이 없습니다");

        System.out.println("[DEBUG_LOG] 출근 기록 없이 퇴근 시도 실패 테스트 완료");
    }

    @Test
    @DisplayName("특정 기간 출퇴근 기록 조회 - 성공")
    void getAttendancesByEmployeeAndPeriod_Success() {
        System.out.println("[DEBUG_LOG] 특정 기간 출퇴근 기록 조회 테스트 시작");

        // Given
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // 출퇴근 기록 생성
        attendanceService.checkIn(testEmployee.getId(), testStore.getId(), latitude, longitude);
        attendanceService.checkOut(testEmployee.getId(), testStore.getId(), latitude, longitude);

        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        // When
        List<Attendance> result = attendanceService.getAttendancesByEmployeeAndPeriod(
                testEmployee.getId(), startDate, endDate);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());
        assertThat(result.get(0).getCheckInTime()).isNotNull();
        assertThat(result.get(0).getCheckOutTime()).isNotNull();

        System.out.println("[DEBUG_LOG] 출퇴근 기록 조회 성공 - 기록 수: " + result.size());
    }

    @Test
    @DisplayName("존재하지 않는 직원으로 출근 시도 - 실패")
    void checkIn_NonExistentEmployee() {
        System.out.println("[DEBUG_LOG] 존재하지 않는 직원 출근 시도 테스트 시작");

        // Given
        Long nonExistentEmployeeId = 99999L;
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // When & Then
        assertThatThrownBy(() -> attendanceService.checkIn(
                nonExistentEmployeeId, testStore.getId(), latitude, longitude))
                .isInstanceOf(EntityNotFoundException.class);

        System.out.println("[DEBUG_LOG] 존재하지 않는 직원 출근 시도 실패 테스트 완료");
    }

    @Test
    @DisplayName("존재하지 않는 매장으로 출근 시도 - 실패")
    void checkIn_NonExistentStore() {
        System.out.println("[DEBUG_LOG] 존재하지 않는 매장 출근 시도 테스트 시작");

        // Given
        Long nonExistentStoreId = 99999L;
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // When & Then
        assertThatThrownBy(() -> attendanceService.checkIn(
                testEmployee.getId(), nonExistentStoreId, latitude, longitude))
                .isInstanceOf(EntityNotFoundException.class);

        System.out.println("[DEBUG_LOG] 존재하지 않는 매장 출근 시도 실패 테스트 완료");
    }

    @Test
    @DisplayName("월별 출퇴근 기록 조회 - 성공")
    void getMonthlyAttendancesByEmployee_Success() {
        System.out.println("[DEBUG_LOG] 월별 출퇴근 기록 조회 테스트 시작");

        // Given
        Double latitude = 37.5665;
        Double longitude = 126.9780;

        // 출퇴근 기록 생성
        attendanceService.checkIn(testEmployee.getId(), testStore.getId(), latitude, longitude);
        attendanceService.checkOut(testEmployee.getId(), testStore.getId(), latitude, longitude);

        LocalDateTime now = LocalDateTime.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        // When
        List<Attendance> result = attendanceService.getMonthlyAttendancesByEmployee(
                testEmployee.getId(), year, month);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result.get(0).getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());

        System.out.println("[DEBUG_LOG] 월별 출퇴근 기록 조회 성공 - 기록 수: " + result.size());
    }

    @Test
    @DisplayName("수동 출퇴근 등록 - 출근만 등록 성공")
    void registerManualAttendance_CheckInOnly_Success() {
        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 (출근만) 테스트 시작");

        // Given
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(2);
        ManualAttendanceRequestDto request = ManualAttendanceRequestDto.builder()
                .employeeId(testEmployee.getId())
                .storeId(testStore.getId())
                .registeredBy(testMaster.getId())
                .checkInTime(checkInTime)
                .reason("수동 출근 등록 테스트")
                .build();

        // When
        Attendance result = attendanceService.registerManualAttendance(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());
        assertThat(result.getStore().getId()).isEqualTo(testStore.getId());
        assertThat(result.getCheckInTime()).isEqualTo(checkInTime);
        assertThat(result.getCheckOutTime()).isNull();
        assertThat(result.getAppliedHourlyWage()).isEqualTo(12000);

        System.out.println("[DEBUG_LOG] 수동 출근 등록 성공 - 출근 시간: " + result.getCheckInTime());
    }

    @Test
    @DisplayName("수동 출퇴근 등록 - 출퇴근 모두 등록 성공")
    void registerManualAttendance_FullAttendance_Success() {
        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 (출퇴근 모두) 테스트 시작");

        // Given
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(8);
        LocalDateTime checkOutTime = LocalDateTime.now().minusHours(1);
        ManualAttendanceRequestDto request = ManualAttendanceRequestDto.builder()
                .employeeId(testEmployee.getId())
                .storeId(testStore.getId())
                .registeredBy(testMaster.getId())
                .checkInTime(checkInTime)
                .checkOutTime(checkOutTime)
                .reason("수동 출퇴근 등록 테스트")
                .build();

        // When
        Attendance result = attendanceService.registerManualAttendance(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmployeeProfile().getId()).isEqualTo(testEmployee.getId());
        assertThat(result.getStore().getId()).isEqualTo(testStore.getId());
        assertThat(result.getCheckInTime()).isEqualTo(checkInTime);
        assertThat(result.getCheckOutTime()).isEqualTo(checkOutTime);
        assertThat(result.getAppliedHourlyWage()).isEqualTo(12000);
        assertThat(result.getWorkingTimeInHours()).isGreaterThan(0);

        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 성공 - 근무 시간: " + result.getWorkingTimeInHours() + "시간");
    }

    @Test
    @DisplayName("수동 출퇴근 등록 - 사업주 권한 없음 실패")
    void registerManualAttendance_NoMasterPermission_Failure() {
        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 권한 없음 테스트 시작");

        // Given
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(2);
        ManualAttendanceRequestDto request = ManualAttendanceRequestDto.builder()
                .employeeId(testEmployee.getId())
                .storeId(testStore.getId())
                .registeredBy(testUser.getId()) // 일반 사용자 ID 사용
                .checkInTime(checkInTime)
                .reason("권한 없음 테스트")
                .build();

        // When & Then
        assertThatThrownBy(() -> attendanceService.registerManualAttendance(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("사업주 권한이 필요합니다");

        System.out.println("[DEBUG_LOG] 사업주 권한 없음 실패 테스트 완료");
    }

    @Test
    @DisplayName("수동 출퇴근 등록 - 중복 기록 존재 실패")
    void registerManualAttendance_DuplicateRecord_Failure() {
        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 중복 기록 테스트 시작");

        // Given - 먼저 출근 기록 생성
        attendanceService.checkIn(testEmployee.getId(), testStore.getId(), 37.5665, 126.9780);

        LocalDateTime checkInTime = LocalDateTime.now().minusMinutes(30); // 같은 날짜
        ManualAttendanceRequestDto request = ManualAttendanceRequestDto.builder()
                .employeeId(testEmployee.getId())
                .storeId(testStore.getId())
                .registeredBy(testMaster.getId())
                .checkInTime(checkInTime)
                .reason("중복 기록 테스트")
                .build();

        // When & Then
        assertThatThrownBy(() -> attendanceService.registerManualAttendance(request))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("이미 출퇴근 기록이 존재합니다");

        System.out.println("[DEBUG_LOG] 중복 기록 존재 실패 테스트 완료");
    }

    @Test
    @DisplayName("수동 출퇴근 등록 - 잘못된 시간 순서 실패")
    void registerManualAttendance_InvalidTimeOrder_Failure() {
        System.out.println("[DEBUG_LOG] 수동 출퇴근 등록 잘못된 시간 순서 테스트 시작");

        // Given
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(1);
        LocalDateTime checkOutTime = LocalDateTime.now().minusHours(2); // 출근 시간보다 빠른 퇴근 시간
        ManualAttendanceRequestDto request = ManualAttendanceRequestDto.builder()
                .employeeId(testEmployee.getId())
                .storeId(testStore.getId())
                .registeredBy(testMaster.getId())
                .checkInTime(checkInTime)
                .checkOutTime(checkOutTime)
                .reason("잘못된 시간 순서 테스트")
                .build();

        // When & Then
        assertThatThrownBy(() -> attendanceService.registerManualAttendance(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("퇴근 시간은 출근 시간보다 늦어야 합니다");

        System.out.println("[DEBUG_LOG] 잘못된 시간 순서 실패 테스트 완료");
    }
}
