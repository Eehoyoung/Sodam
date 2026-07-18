package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.StoreEmployeeResponseDto;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 매장 직원 명부 조회 — findings_report.md §2 실증 확정 PII 노출 수정 회귀 테스트.
 *
 * <p>이전에는 {@code GET /api/stores/{storeId}/employees}가 {@code User} 엔티티를 그대로
 * 반환해 email/생년월일/동의 시각/탈퇴 시각까지 응답에 노출됐다. {@link StoreEmployeeResponseDto}로
 * 전환한 뒤 필요한 필드만 담기고, 민감 필드는 애초에 담을 필드 자체가 없는지 검증한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreManagementServiceEmployeeRosterTest {

    @Autowired
    private StoreManagementServiceImpl storeManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;

    private Store store;

    @BeforeEach
    void setUp() {
        User employeeUser = new User("roster_emp@example.com", "김직원");
        employeeUser.setPhone("010-1234-5678");
        employeeUser.setBirthDate(LocalDate.of(1995, 3, 1));
        employeeUser.setTermsAgreedAt(LocalDateTime.now());
        employeeUser.setPrivacyAgreedAt(LocalDateTime.now());
        employeeUser.setUserGrade(UserGrade.EMPLOYEE);
        employeeUser = userRepository.save(employeeUser);

        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(employeeUser));

        store = storeRepository.save(new Store("로스터테스트매장", "1112223330", "02-0000-0000", "음식점", 10000, 100));

        employeeStoreRelationRepository.save(new EmployeeStoreRelation(profile, store, 10500));
    }

    @Test
    @DisplayName("직원 명부 응답에 이름·이메일·전화번호·역할만 담기고 생년월일·동의시각 등 민감 필드는 없다")
    void getEmployeesByStore_returnsOnlyNeededFields() {
        List<StoreEmployeeResponseDto> roster = storeManagementService.getEmployeesByStore(store.getId());

        assertThat(roster).hasSize(1);
        StoreEmployeeResponseDto dto = roster.get(0);
        assertThat(dto.getName()).isEqualTo("김직원");
        assertThat(dto.getEmail()).isEqualTo("roster_emp@example.com");
        assertThat(dto.getPhone()).isEqualTo("010-1234-5678");
        assertThat(dto.getUserGrade()).isEqualTo("EMPLOYEE");

        // 구조적 보장: StoreEmployeeResponseDto 자체에 birthDate/동의시각/탈퇴시각 필드가 없어
        // 리플렉션으로도 노출될 수 없음(엔티티 직접 반환이던 과거와 달리 담을 필드 자체가 없다).
        assertThat(dto.getClass().getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .containsExactlyInAnyOrder("id", "name", "email", "phone", "userGrade");
    }
}
