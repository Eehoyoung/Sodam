package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * UserService 통합 테스트
 * AUTH-008 사업주 전환 기능을 포함한 사용자 서비스 테스트
 */
@SpringBootTest
@Transactional
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        // 테스트용 사용자 생성
        testUser = new User("test@example.com", "테스트사용자");
        testUser.setPassword("encodedPassword");
        testUser = userRepository.save(testUser);
    }

    @Test
    @DisplayName("사업주 전환 - 성공: 일반 사용자를 사업주로 전환")
    void convertToOwner_Success() {
        // Given
        assertEquals(UserGrade.Personal, testUser.getUserGrade());

        // When
        User result = userService.convertToOwner(testUser.getId());

        // Then
        assertNotNull(result);
        assertEquals(UserGrade.MASTER, result.getUserGrade());
        assertEquals("test@example.com", result.getEmail());
        assertEquals("테스트사용자", result.getName());
    }

    @Test
    @DisplayName("사업주 전환 - 실패: 존재하지 않는 사용자")
    void convertToOwner_UserNotFound() {
        // Given
        Long nonExistentUserId = 999L;

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.convertToOwner(nonExistentUserId)
        );

        assertEquals("사용자를 찾을 수 없습니다. ID: " + nonExistentUserId, exception.getMessage());
    }

    @Test
    @DisplayName("사업주 전환 - 실패: 이미 사업주인 사용자")
    void convertToOwner_AlreadyMaster() {
        // Given
        testUser.changeToMaster();
        userRepository.save(testUser);

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.convertToOwner(testUser.getId())
        );

        assertEquals("이미 사업주 권한을 가진 사용자입니다.", exception.getMessage());
    }

    @Test
    @DisplayName("사업주 전환 - 실패: 직원 등급 사용자")
    void convertToOwner_EmployeeUser() {
        // Given
        testUser.changeToEmployee();
        userRepository.save(testUser);

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.convertToOwner(testUser.getId())
        );

        assertEquals("일반 사용자만 사업주로 전환할 수 있습니다. 현재 등급: " + UserGrade.EMPLOYEE, exception.getMessage());
    }

    @Test
    @DisplayName("사용자 ID로 조회 - 성공")
    void findById_Success() {
        // When
        Optional<User> result = userService.findById(testUser.getId());

        // Then
        assertTrue(result.isPresent());
        assertEquals("test@example.com", result.get().getEmail());
        assertEquals("테스트사용자", result.get().getName());
        assertEquals(UserGrade.Personal, result.get().getUserGrade());
    }

    @Test
    @DisplayName("사용자 ID로 조회 - 실패: 존재하지 않는 사용자")
    void findById_UserNotFound() {
        // Given
        Long nonExistentUserId = 999L;

        // When
        Optional<User> result = userService.findById(nonExistentUserId);

        // Then
        assertFalse(result.isPresent());
    }

    @Test
    @DisplayName("회원가입 - 성공")
    void joinUser_Success() {
        // Given
        JoinDto joinDto = new JoinDto();
        joinDto.setEmail("newuser@example.com");
        joinDto.setName("신규사용자");
        joinDto.setPassword("password123");

        // When
        User result = userService.joinUser(joinDto, "Master");

        // Then
        assertNotNull(result);
        assertEquals("newuser@example.com", result.getEmail());
        assertEquals("신규사용자", result.getName());
        assertEquals(UserGrade.Personal, result.getUserGrade());
        assertNotNull(result.getCreatedAt());
        // 비밀번호는 암호화되어 저장되므로 직접 비교하지 않음
        assertNotNull(result.getPassword());
    }

    @Test
    @DisplayName("직원 정보 수정 - 성공: 이름과 이메일 수정")
    void updateEmployeeInfo_Success() {
        // Given
        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setName("수정된이름");
        updateDto.setEmail("updated@example.com");
        updateDto.setUserGrade(UserGrade.EMPLOYEE);

        // When
        User result = userService.updateEmployeeInfo(testUser.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals("수정된이름", result.getName());
        assertEquals("updated@example.com", result.getEmail());
        assertEquals(UserGrade.EMPLOYEE, result.getUserGrade());
    }

    @Test
    @DisplayName("직원 정보 수정 - 성공: 직책을 사업주로 변경")
    void updateEmployeeInfo_ChangeToMaster_Success() {
        // Given
        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setUserGrade(UserGrade.MASTER);

        // When
        User result = userService.updateEmployeeInfo(testUser.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals(UserGrade.MASTER, result.getUserGrade());
        assertEquals("test@example.com", result.getEmail()); // 기존 정보 유지
        assertEquals("테스트사용자", result.getName()); // 기존 정보 유지
    }

    @Test
    @DisplayName("직원 정보 수정 - 실패: 존재하지 않는 직원")
    void updateEmployeeInfo_EmployeeNotFound() {
        // Given
        Long nonExistentEmployeeId = 999L;
        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setName("수정된이름");

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updateEmployeeInfo(nonExistentEmployeeId, updateDto)
        );

        assertEquals("직원을 찾을 수 없습니다. ID: " + nonExistentEmployeeId, exception.getMessage());
    }

    @Test
    @DisplayName("직원 정보 수정 - 실패: 이메일 중복")
    void updateEmployeeInfo_EmailDuplicate() {
        // Given
        // 다른 사용자 생성
        User anotherUser = new User("another@example.com", "다른사용자");
        anotherUser.setPassword("password");
        anotherUser = userRepository.save(anotherUser);

        // 기존 사용자의 이메일을 다른 사용자의 이메일로 변경 시도
        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setEmail("another@example.com");

        // When & Then
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updateEmployeeInfo(testUser.getId(), updateDto)
        );

        assertEquals("이미 사용 중인 이메일입니다: another@example.com", exception.getMessage());
    }

    @Test
    @DisplayName("직원 정보 수정 - 성공: 부분 업데이트 (이름만 수정)")
    void updateEmployeeInfo_PartialUpdate_Success() {
        // Given
        String originalEmail = testUser.getEmail();
        UserGrade originalGrade = testUser.getUserGrade();

        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setName("부분수정이름");
        // email과 userGrade는 null로 두어 기존 값 유지

        // When
        User result = userService.updateEmployeeInfo(testUser.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals("부분수정이름", result.getName());
        assertEquals(originalEmail, result.getEmail()); // 기존 값 유지
        assertEquals(originalGrade, result.getUserGrade()); // 기존 값 유지
    }

    @Test
    @DisplayName("직원 정보 수정 - 성공: 같은 이메일로 수정 (중복 검사 통과)")
    void updateEmployeeInfo_SameEmail_Success() {
        // Given
        EmployeeUpdateDto updateDto = new EmployeeUpdateDto();
        updateDto.setName("이름수정");
        updateDto.setEmail(testUser.getEmail()); // 같은 이메일로 설정

        // When
        User result = userService.updateEmployeeInfo(testUser.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals("이름수정", result.getName());
        assertEquals(testUser.getEmail(), result.getEmail());
    }
}
