package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.StoreRole;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreManagerServiceTest {
    @Mock StoreAccessGuard guard;
    @Mock PlanAccessService planAccessService;
    @Mock StoreRepository storeRepository;
    @Mock EmployeeStoreRelationRepository relationRepository;
    @Mock StoreDelegationAuditRepository auditRepository;
    StoreManagerService service;

    @BeforeEach
    void setUp() {
        service = new StoreManagerService(guard, planAccessService, storeRepository, relationRepository, auditRepository);
    }

    @Test
    void storeIsLockedBeforeRelationAndCountAndDefaultPresetIsUsed() {
        Store store = mock(Store.class);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);
        when(storeRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(store));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));
        when(relationRepository.countByStore_IdAndStoreRoleAndIsActiveTrue(10L, StoreRole.MANAGER)).thenReturn(0L);
        when(relationRepository.save(relation)).thenReturn(relation);

        EmployeeStoreRelation saved = service.draftAppointment(1L, 10L, 20L, null);

        assertThat(saved.getGrantedPermissions()).isEqualTo(ManagerPermission.defaultPreset());
        InOrder order = inOrder(storeRepository, relationRepository);
        order.verify(storeRepository).findByIdForUpdate(10L);
        order.verify(relationRepository).findRelationForUpdate(20L, 10L);
        order.verify(relationRepository).countByStore_IdAndStoreRoleAndIsActiveTrue(10L, StoreRole.MANAGER);
    }

    @Test
    void thirdManagerIsRejectedWhileHoldingStoreLock() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);
        when(storeRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mock(Store.class)));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));
        when(relationRepository.countByStore_IdAndStoreRoleAndIsActiveTrue(10L, StoreRole.MANAGER)).thenReturn(2L);

        assertThatThrownBy(() -> service.draftAppointment(
                1L, 10L, 20L, EnumSet.of(ManagerPermission.STAFF_VIEW)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("최대 2명");
        verify(relationRepository, never()).save(any());
    }

    @Test
    void expansionIsStagedWithoutGrantingNewPermission() {
        EmployeeStoreRelation relation = activeManagerWith(
                ManagerPermission.ATTENDANCE_APPROVE);
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);
        when(storeRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mock(Store.class)));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));

        StoreManagerService.PermissionChangeDraft result = service.changePermissions(
                1L, 10L, 20L,
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE));

        assertThat(result.signatureRequired()).isTrue();
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isFalse();
        assertThat(relation.getPendingManagerPermissions()).contains(ManagerPermission.TIMEOFF_APPROVE);
        verify(auditRepository).save(argThat(audit ->
                audit.getAction() == com.rich.sodam.domain.StoreDelegationAudit.Action.EXPANSION_STAGED));
    }

    @Test
    void reductionAppliesImmediatelyWithoutNewSignature() {
        EmployeeStoreRelation relation = activeManagerWith(
                ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE);
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);
        when(storeRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(mock(Store.class)));
        when(relationRepository.findRelationForUpdate(20L, 10L)).thenReturn(Optional.of(relation));

        StoreManagerService.PermissionChangeDraft result = service.changePermissions(
                1L, 10L, 20L, EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE));

        assertThat(result.signatureRequired()).isFalse();
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isFalse();
        assertThat(relation.getPendingManagerPermissions()).isNull();
    }

    private EmployeeStoreRelation activeManagerWith(ManagerPermission first, ManagerPermission... rest) {
        EnumSet<ManagerPermission> permissions = EnumSet.of(first, rest);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(permissions, java.time.LocalDateTime.now());
        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), java.time.LocalDateTime.now());
        return relation;
    }
}
