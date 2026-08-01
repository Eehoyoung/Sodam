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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JoinStoreByCodeSecurityTest {

    @Autowired private StoreManagementServiceImpl storeManagementService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private StoreRepository storeRepository;

    @Test
    void inactiveFormerEmployeeCannotReactivateMembershipWithRetainedStoreCode() {
        User user = new User("former-join@example.test", "Former employee");
        user.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.saveAndFlush(user);
        EmployeeProfile profile = employeeProfileRepository.saveAndFlush(new EmployeeProfile(user));
        Store store = storeRepository.saveAndFlush(
                new Store("Rejoin test", "4445556667", "02-444-5555", "Cafe", 10_000, 100));
        EmployeeStoreRelation relation = relationRepository.saveAndFlush(
                new EmployeeStoreRelation(profile, store));
        relation.changeActive(false);
        relationRepository.saveAndFlush(relation);
        Long userId = user.getId();
        Long storeId = store.getId();
        String storeCode = store.getStoreCode();

        assertThatThrownBy(() -> storeManagementService.joinStoreByCode(userId, storeCode))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(relationRepository.findRelation(profile.getId(), storeId).orElseThrow().getIsActive())
                .isFalse();
    }
}
