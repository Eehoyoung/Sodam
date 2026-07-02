package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 직원 활성/비활성 토글(퇴사·복직) — 서비스·리포 레벨 CRUD 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeActiveToggleTest {

    @Autowired private StoreManagementServiceImpl service;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    private Long[] seed() {
        User u = userRepository.saveAndFlush(emp());
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(u));
        Store store = storeRepository.save(new Store("토글매장", "1112223334", "02-1", "카페", 12_000, 100));
        relationRepository.save(new EmployeeStoreRelation(profile, store, 12_000));
        return new Long[]{store.getId(), profile.getId()};
    }

    private User emp() {
        User u = new User("toggle_emp@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return u;
    }

    @Test
    @DisplayName("비활성화→재활성화 토글이 반영된다")
    void toggleActive() {
        Long[] ids = seed();
        Long storeId = ids[0], employeeId = ids[1];

        service.setEmployeeActive(storeId, employeeId, false);
        assertThat(relationRepository.findRelation(employeeId, storeId).orElseThrow().getIsActive()).isFalse();

        service.setEmployeeActive(storeId, employeeId, true);
        assertThat(relationRepository.findRelation(employeeId, storeId).orElseThrow().getIsActive()).isTrue();
    }

    @Test
    @DisplayName("존재하지 않는 관계는 예외")
    void missingRelation() {
        assertThatThrownBy(() -> service.setEmployeeActive(999L, 999L, false))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
