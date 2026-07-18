package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.StoreRole;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;

class EmployeeStoreRelationManagerTest {
    @Test
    void permissionIsInactiveUntilMatchingEnvelopeIsActivated() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());

        assertThat(relation.getStoreRole()).isEqualTo(StoreRole.MANAGER);
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.ATTENDANCE_APPROVE)).isFalse();

        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.ATTENDANCE_APPROVE)).isTrue();
    }

    @Test
    void deactivationImmediatelyRemovesEveryManagerPermission() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(ManagerPermission.defaultPreset(), LocalDateTime.now());
        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), LocalDateTime.now());

        relation.changeActive(false);

        assertThat(relation.getStoreRole()).isEqualTo(StoreRole.STAFF);
        assertThat(relation.getGrantedPermissions()).isEmpty();
        assertThat(relation.getManagerAcceptedAt()).isNull();
        assertThat(relation.getManagerSignatureEnvelopeId()).isNull();
    }

    @Test
    void expandedPermissionsStayPendingUntilMatchingEnvelopeIsVerified() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), LocalDateTime.now());

        int pendingVersion = relation.stageManagerPermissionChange(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE),
                LocalDateTime.now());

        assertThat(relation.hasActiveManagerPermission(ManagerPermission.ATTENDANCE_APPROVE)).isTrue();
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isFalse();
        assertThat(relation.getPendingManagerDelegationVersion()).isEqualTo(pendingVersion);

        relation.activateManagerDelegation(92L, pendingVersion, LocalDateTime.now());

        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isTrue();
        assertThat(relation.getPendingManagerPermissions()).isNull();
        assertThat(relation.getPendingManagerDelegationVersion()).isNull();
        assertThat(relation.getManagerSignatureEnvelopeId()).isEqualTo(92L);
    }

    @Test
    void reducedPermissionsApplyImmediatelyAndCancelPendingExpansion() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE),
                LocalDateTime.now());
        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        int previousVersion = relation.getManagerDelegationVersion();
        relation.stageManagerPermissionChange(ManagerPermission.defaultPreset(), LocalDateTime.now());

        relation.reduceManagerPermissions(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE));

        assertThat(relation.hasActiveManagerPermission(ManagerPermission.ATTENDANCE_APPROVE)).isTrue();
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isFalse();
        assertThat(relation.getManagerDelegationVersion()).isEqualTo(previousVersion + 1);
        assertThat(relation.getPendingManagerPermissions()).isNull();
    }

    @Test
    void reissuedExpansionUsesANewVersionAndKeepsCurrentPermissions() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        relation.activateManagerDelegation(91L, relation.getManagerDelegationVersion(), LocalDateTime.now());

        int failedVersion = relation.stageManagerPermissionChange(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE),
                LocalDateTime.now());
        int reissuedVersion = relation.stageManagerPermissionChange(
                EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE, ManagerPermission.TIMEOFF_APPROVE),
                LocalDateTime.now());

        assertThat(reissuedVersion).isEqualTo(failedVersion + 1);
        assertThat(relation.hasActiveManagerPermission(ManagerPermission.TIMEOFF_APPROVE)).isFalse();
    }
}
