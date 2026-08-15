package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 직원 소속 매장 조회 — includeInactive 분기 (WP-6).
 *
 * <p>기본(false)은 매장 패스 전환 UI용으로 활성 관계만(기존 동작 유지). true는 경력증명서
 * (WP-6) 전용 — 퇴사(비활성 관계)한 매장도 포함해 퇴사 후에도 본인 스코프로 조회 가능하게 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreManagementServiceEmployeeStoresTest {

    @Autowired private StoreManagementServiceImpl storeManagementService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    private Long userId;
    private Store activeStore;
    private Store formerStore;

    @BeforeEach
    void setUp() {
        User user = new User("empstores@example.com", "직원");
        user.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.save(user);
        userId = user.getId();
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(user));

        activeStore = storeRepository.save(new Store("현재매장", "1230001110", "02-111-0000", "카페", 10_000, 100));
        formerStore = storeRepository.save(new Store("퇴사매장", "1230002220", "02-222-0000", "카페", 10_000, 100));

        relationRepository.save(new EmployeeStoreRelation(profile, activeStore, 10_000));
        EmployeeStoreRelation former = new EmployeeStoreRelation(profile, formerStore, 10_000);
        former.setIsActive(false);
        relationRepository.save(former);
    }

    @Test
    @DisplayName("기본(includeInactive 생략) — 활성 매장만 반환, 퇴사 매장은 제외")
    void defaultExcludesInactive() {
        List<Store> stores = storeManagementService.getStoresByEmployee(userId);

        assertThat(stores).extracting(Store::getId).containsExactly(activeStore.getId());
    }

    @Test
    @DisplayName("includeInactive=false — 명시적으로도 활성 매장만 반환")
    void explicitFalseExcludesInactive() {
        List<Store> stores = storeManagementService.getStoresByEmployee(userId, false);

        assertThat(stores).extracting(Store::getId).containsExactly(activeStore.getId());
    }

    @Test
    @DisplayName("includeInactive=true — 퇴사(비활성) 매장까지 포함해 반환(WP-6 경력증명서 대상)")
    void includeInactiveReturnsFormerStoresToo() {
        List<Store> stores = storeManagementService.getStoresByEmployee(userId, true);

        assertThat(stores).extracting(Store::getId)
                .containsExactlyInAnyOrder(activeStore.getId(), formerStore.getId());
    }
}
