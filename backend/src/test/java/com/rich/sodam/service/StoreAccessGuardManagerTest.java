package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.exception.ManagerAccessDeniedException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreAccessGuardManagerTest {
    @Mock MasterStoreRelationRepository masterRepository;
    @Mock EmployeeStoreRelationRepository employeeRepository;
    @Mock TimeOffRepository timeOffRepository;
    @Mock PlanAccessService planAccessService;
    StoreAccessGuard guard;

    @BeforeEach
    void setUp() {
        guard = new StoreAccessGuard(masterRepository, employeeRepository, timeOffRepository, planAccessService, true);
    }

    @Test
    void regularEmployeeGetsMgr001() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L))
                .thenReturn(Optional.of(relation));
        assertCode(ManagerPermission.ATTENDANCE_APPROVE, "MGR-001");
    }

    @Test
    void unsignedManagerGetsMgr004() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L))
                .thenReturn(Optional.of(relation));
        assertCode(ManagerPermission.ATTENDANCE_APPROVE, "MGR-004");
    }

    @Test
    void signedManagerOnFreeStoreGetsMgr005() {
        EmployeeStoreRelation relation = activeManager();
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(false);
        assertCode(ManagerPermission.ATTENDANCE_APPROVE, "MGR-005");
    }

    @Test
    void ownerBypassesManagerLookupAndTierGate() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(1L, 10L)).thenReturn(true);
        assertThatCode(() -> guard.assertMasterOrManagerPermission(
                1L, 10L, ManagerPermission.ATTENDANCE_APPROVE)).doesNotThrowAnyException();
        verifyNoInteractions(employeeRepository, planAccessService);
    }

    @Test
    void disabledFeatureFailsClosedBeforeRelationLookup() {
        StoreAccessGuard disabled = new StoreAccessGuard(
                masterRepository, employeeRepository, timeOffRepository, planAccessService, false);

        assertThatThrownBy(() -> disabled.assertManagerPermission(
                2L, 10L, ManagerPermission.ATTENDANCE_APPROVE))
                .isInstanceOfSatisfying(ManagerAccessDeniedException.class,
                        error -> org.assertj.core.api.Assertions.assertThat(error.getCode()).isEqualTo("MGR-006"));
        verifyNoInteractions(employeeRepository, planAccessService);
    }

    private EmployeeStoreRelation activeManager() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        relation.activateManagerDelegation(88L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        return relation;
    }

    private void assertCode(ManagerPermission permission, String code) {
        assertThatThrownBy(() -> guard.assertManagerPermission(2L, 10L, permission))
                .isInstanceOfSatisfying(ManagerAccessDeniedException.class,
                        error -> org.assertj.core.api.Assertions.assertThat(error.getCode()).isEqualTo(code));
    }
}
