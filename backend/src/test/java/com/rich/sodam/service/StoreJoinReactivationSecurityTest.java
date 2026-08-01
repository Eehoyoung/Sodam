package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.service.support.AfterCommitExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StoreJoinReactivationSecurityTest {

    @Test
    void inactiveFormerEmployeeCannotRestoreMembershipWithRetainedStoreCode() {
        EmployeeProfileRepository employeeProfileRepository = mock(EmployeeProfileRepository.class);
        StoreRepository storeRepository = mock(StoreRepository.class);
        EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
        LiveSyncPublisher liveSyncPublisher = mock(LiveSyncPublisher.class);
        AfterCommitExecutor afterCommitExecutor = mock(AfterCommitExecutor.class);
        StoreManagementServiceImpl service = spy(new StoreManagementServiceImpl(
                null, null, employeeProfileRepository, storeRepository, null, relationRepository,
                null, null, null, null, null, null, liveSyncPublisher, null, null, null,
                null, null, null, afterCommitExecutor));

        User user = new User("former-join@example.test", "Former employee");
        user.setUserGrade(UserGrade.EMPLOYEE);
        EmployeeProfile profile = new EmployeeProfile(user);
        Store store = new Store("Rejoin test", "4445556667", "02-444-5555", "Cafe", 10_000, 100);
        EmployeeStoreRelation inactiveRelation = new EmployeeStoreRelation(profile, store);
        inactiveRelation.changeActive(false);
        doNothing().when(service).assignUserToStoreAsEmployee(eq(2L), any(), isNull());
        when(storeRepository.findActiveByStoreCode("retained-code")).thenReturn(Optional.of(store));
        when(employeeProfileRepository.findById(2L)).thenReturn(Optional.of(profile));
        when(relationRepository.findByEmployeeProfileAndStore(profile, store)).thenReturn(Optional.of(inactiveRelation));

        assertThatThrownBy(() -> service.joinStoreByCode(2L, "retained-code"))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(inactiveRelation.getIsActive()).isFalse();
        verify(service, never()).assignUserToStoreAsEmployee(eq(2L), any(), isNull());
    }
}
