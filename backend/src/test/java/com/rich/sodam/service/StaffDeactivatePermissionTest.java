package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.exception.ManagerAccessDeniedException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * WP-2(260817 퇴사 처리 기능 계획서) — {@code StoreController.setEmployeeActive}에 배선한
 * {@code STAFF_DEACTIVATE} 권한 분기 검증. 가드 메커니즘 자체는 {@code StoreAccessGuardManagerTest}가
 * 임의 권한에 대해 이미 검증하므로, 여기서는 이 특정 권한값에 대한 분기(미보유/보유/사장 우회)만 확인한다.
 */
@ExtendWith(MockitoExtension.class)
class StaffDeactivatePermissionTest {

    @Mock MasterStoreRelationRepository masterRepository;
    @Mock EmployeeStoreRelationRepository employeeRepository;
    @Mock TimeOffRepository timeOffRepository;
    @Mock PlanAccessService planAccessService;
    StoreAccessGuard guard;

    @BeforeEach
    void setUp() {
        guard = new StoreAccessGuard(new StoreAuthorizationPolicy(
                masterRepository, employeeRepository, timeOffRepository, planAccessService, true));
    }

    @Test
    @DisplayName("STAFF_DEACTIVATE 미보유 매니저는 비활성화 시도 시 거부된다")
    void managerWithoutStaffDeactivateIsDenied() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        relation.activateManagerDelegation(88L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);

        assertThatThrownBy(() -> guard.assertMasterOrManagerPermission(2L, 10L, ManagerPermission.STAFF_DEACTIVATE))
                .isInstanceOf(ManagerAccessDeniedException.class);
    }

    @Test
    @DisplayName("STAFF_DEACTIVATE 보유 매니저는 비활성화를 정상 대리 처리할 수 있다")
    void managerWithStaffDeactivateIsAllowed() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.STAFF_DEACTIVATE), LocalDateTime.now());
        relation.activateManagerDelegation(88L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(2L, 10L))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(10L, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);

        assertThatCode(() -> guard.assertMasterOrManagerPermission(2L, 10L, ManagerPermission.STAFF_DEACTIVATE))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("사장은 매니저 조회 없이 항상 통과한다(기존 경로 회귀 없음)")
    void ownerAlwaysPassesRegardlessOfPermission() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(1L, 10L)).thenReturn(true);

        assertThatCode(() -> guard.assertMasterOrManagerPermission(1L, 10L, ManagerPermission.STAFF_DEACTIVATE))
                .doesNotThrowAnyException();
        verifyNoInteractions(employeeRepository, planAccessService);
    }

    @Test
    @DisplayName("DEFAULT_PRESET에는 STAFF_DEACTIVATE가 포함되지 않는다(HC-6) — 사장이 명시적으로 부여해야만 매니저가 갖는다")
    void defaultPresetDoesNotIncludeStaffDeactivate() {
        assertThat(ManagerPermission.defaultPreset()).doesNotContain(ManagerPermission.STAFF_DEACTIVATE);
    }
}
