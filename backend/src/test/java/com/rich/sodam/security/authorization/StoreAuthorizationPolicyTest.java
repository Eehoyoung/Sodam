package com.rich.sodam.security.authorization;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.exception.ManagerAccessDeniedException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.TimeOffRepository;
import com.rich.sodam.service.PlanAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * WP-08(인가 정책 모듈화): {@link StoreAuthorizationPolicy} 는 {@code StoreAccessGuard}
 * (구 {@code com.rich.sodam.service.StoreAccessGuard})에서 그대로 이동한 인가 로직 원본이다.
 * 이 테스트는 이동 후에도 master/employee/manager/self/타 매장/비소속 조합의 동작이
 * 원본과 동일함을 matrix 형태로 검증한다.
 *
 * <p>{@code ManagerPermission.CONTRACT_MANAGE}/{@code PAYROLL_CONFIRM} 은 노무사 검토
 * 미완료 상태(CLAUDE.md)이므로, 이 테스트는 의도적으로 {@code ATTENDANCE_APPROVE} 등
 * 검토 완료된 권한만 사용한다.
 */
@ExtendWith(MockitoExtension.class)
class StoreAuthorizationPolicyTest {

    @Mock MasterStoreRelationRepository masterRepository;
    @Mock EmployeeStoreRelationRepository employeeRepository;
    @Mock TimeOffRepository timeOffRepository;
    @Mock PlanAccessService planAccessService;

    StoreAuthorizationPolicy policy;

    private static final Long MASTER_ID = 1L;
    private static final Long OTHER_MASTER_ID = 99L;
    private static final Long EMPLOYEE_ID = 2L;
    private static final Long OTHER_EMPLOYEE_ID = 20L;
    private static final Long STORE_ID = 10L;
    private static final Long OTHER_STORE_ID = 11L;

    @BeforeEach
    void setUp() {
        policy = new StoreAuthorizationPolicy(
                masterRepository, employeeRepository, timeOffRepository, planAccessService, true);
    }

    // ── assertMasterOwnsStore ─────────────────────────────────────

    @Test
    void masterOwnsStore_passes() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);
        assertThatCode(() -> policy.assertMasterOwnsStore(MASTER_ID, STORE_ID)).doesNotThrowAnyException();
    }

    @Test
    void masterDoesNotOwnAnotherStore_throws() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, OTHER_STORE_ID)).thenReturn(false);
        assertThatThrownBy(() -> policy.assertMasterOwnsStore(MASTER_ID, OTHER_STORE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── assertEmployeeInStore ─────────────────────────────────────

    @Test
    void employeeInOwnStore_passes() {
        when(employeeRepository.existsByEmployeeProfile_IdAndStore_Id(EMPLOYEE_ID, STORE_ID)).thenReturn(true);
        assertThatCode(() -> policy.assertEmployeeInStore(EMPLOYEE_ID, STORE_ID)).doesNotThrowAnyException();
    }

    @Test
    void employeeNotInStore_throws() {
        when(employeeRepository.existsByEmployeeProfile_IdAndStore_Id(EMPLOYEE_ID, OTHER_STORE_ID)).thenReturn(false);
        assertThatThrownBy(() -> policy.assertEmployeeInStore(EMPLOYEE_ID, OTHER_STORE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── assertMemberOfStore ───────────────────────────────────────

    @Test
    void memberOfStore_masterPasses() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);
        assertThatCode(() -> policy.assertMemberOfStore(MASTER_ID, STORE_ID)).doesNotThrowAnyException();
    }

    @Test
    void memberOfStore_employeePasses() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(EMPLOYEE_ID, STORE_ID)).thenReturn(false);
        when(employeeRepository.existsByEmployeeProfile_IdAndStore_Id(EMPLOYEE_ID, STORE_ID)).thenReturn(true);
        assertThatCode(() -> policy.assertMemberOfStore(EMPLOYEE_ID, STORE_ID)).doesNotThrowAnyException();
    }

    @Test
    void nonMember_throws() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(OTHER_EMPLOYEE_ID, STORE_ID)).thenReturn(false);
        when(employeeRepository.existsByEmployeeProfile_IdAndStore_Id(OTHER_EMPLOYEE_ID, STORE_ID)).thenReturn(false);
        assertThatThrownBy(() -> policy.assertMemberOfStore(OTHER_EMPLOYEE_ID, STORE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── assertSelf ────────────────────────────────────────────────

    @Test
    void self_matchingIds_passes() {
        assertThatCode(() -> policy.assertSelf(EMPLOYEE_ID, EMPLOYEE_ID)).doesNotThrowAnyException();
    }

    @Test
    void self_mismatchedIds_throws() {
        assertThatThrownBy(() -> policy.assertSelf(EMPLOYEE_ID, OTHER_EMPLOYEE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── assertCanViewEmployee ─────────────────────────────────────

    @Test
    void canViewEmployee_selfAlwaysPasses() {
        assertThatCode(() -> policy.assertCanViewEmployee(EMPLOYEE_ID, EMPLOYEE_ID, false))
                .doesNotThrowAnyException();
        verifyNoInteractions(employeeRepository, masterRepository);
    }

    @Test
    void canViewEmployee_masterOfEmployeesStore_passes() {
        Store store = storeWithId(STORE_ID);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.setStore(store);
        when(employeeRepository.findByEmployeeProfile_Id(OTHER_EMPLOYEE_ID)).thenReturn(List.of(relation));
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);

        assertThatCode(() -> policy.assertCanViewEmployee(MASTER_ID, OTHER_EMPLOYEE_ID, true))
                .doesNotThrowAnyException();
    }

    @Test
    void canViewEmployee_masterNotOwningEmployeesStore_throws() {
        Store store = storeWithId(OTHER_STORE_ID);
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.setStore(store);
        when(employeeRepository.findByEmployeeProfile_Id(OTHER_EMPLOYEE_ID)).thenReturn(List.of(relation));
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, OTHER_STORE_ID)).thenReturn(false);

        assertThatThrownBy(() -> policy.assertCanViewEmployee(MASTER_ID, OTHER_EMPLOYEE_ID, true))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void canViewEmployee_nonMasterRoleDifferentPerson_throws() {
        assertThatThrownBy(() -> policy.assertCanViewEmployee(EMPLOYEE_ID, OTHER_EMPLOYEE_ID, false))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(employeeRepository, masterRepository);
    }

    // ── assertMasterOwnsTimeOff ───────────────────────────────────

    @Test
    void masterOwnsTimeOff_passes() {
        Store store = storeWithId(STORE_ID);
        TimeOff timeOff = new TimeOff();
        timeOff.setStore(store);
        when(timeOffRepository.findById(100L)).thenReturn(Optional.of(timeOff));
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);

        assertThatCode(() -> policy.assertMasterOwnsTimeOff(MASTER_ID, 100L)).doesNotThrowAnyException();
    }

    @Test
    void masterDoesNotOwnTimeOffStore_throws() {
        Store store = storeWithId(OTHER_STORE_ID);
        TimeOff timeOff = new TimeOff();
        timeOff.setStore(store);
        when(timeOffRepository.findById(100L)).thenReturn(Optional.of(timeOff));
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, OTHER_STORE_ID)).thenReturn(false);

        assertThatThrownBy(() -> policy.assertMasterOwnsTimeOff(MASTER_ID, 100L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void timeOffNotFound_throws() {
        when(timeOffRepository.findById(999L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> policy.assertMasterOwnsTimeOff(MASTER_ID, 999L))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── assertManagerPermission ───────────────────────────────────

    @Test
    void manager_notFoundRelation_throwsPermissionDenied() {
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.empty());
        assertManagerCode(EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE, "MGR-001");
    }

    @Test
    void manager_regularStaff_throwsPermissionDenied() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.of(relation));
        assertManagerCode(EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE, "MGR-001");
    }

    @Test
    void manager_signaturePending_throwsSignaturePending() {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE), LocalDateTime.now());
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.of(relation));
        assertManagerCode(EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE, "MGR-004");
    }

    @Test
    void manager_subscriptionFrozen_throwsSubscriptionFrozen() {
        EmployeeStoreRelation relation = activeManager(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE));
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(STORE_ID, PlanFeature.MANAGER_DELEGATION)).thenReturn(false);
        assertManagerCode(EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE, "MGR-005");
    }

    @Test
    void manager_missingSpecificPermission_throwsPermissionDenied() {
        // 서명 완료·구독 활성이지만 요청 권한(SCHEDULE_MANAGE)이 부여목록에 없는 케이스.
        EmployeeStoreRelation relation = activeManager(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE));
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(STORE_ID, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);
        assertManagerCode(EMPLOYEE_ID, STORE_ID, ManagerPermission.SCHEDULE_MANAGE, "MGR-001");
    }

    @Test
    void manager_fullyQualified_passes() {
        EmployeeStoreRelation relation = activeManager(EnumSet.of(ManagerPermission.ATTENDANCE_APPROVE));
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.of(relation));
        when(planAccessService.storeOwnerHasFeature(STORE_ID, PlanFeature.MANAGER_DELEGATION)).thenReturn(true);

        assertThatCode(() -> policy.assertManagerPermission(EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE))
                .doesNotThrowAnyException();
    }

    @Test
    void manager_delegationFeatureDisabled_throwsFeatureDisabledBeforeLookup() {
        StoreAuthorizationPolicy disabled = new StoreAuthorizationPolicy(
                masterRepository, employeeRepository, timeOffRepository, planAccessService, false);

        assertThatThrownBy(() -> disabled.assertManagerPermission(
                EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE))
                .isInstanceOfSatisfying(ManagerAccessDeniedException.class,
                        error -> assertThat(error.getCode()).isEqualTo("MGR-006"));
        verifyNoInteractions(employeeRepository, planAccessService);
    }

    // ── assertMasterOrManagerPermission ───────────────────────────

    @Test
    void masterOrManager_masterBypassesManagerLookup() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);

        assertThatCode(() -> policy.assertMasterOrManagerPermission(
                MASTER_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE)).doesNotThrowAnyException();
        verifyNoInteractions(employeeRepository, planAccessService);
    }

    @Test
    void masterOrManager_nonMasterDelegatesToManagerCheck() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(EMPLOYEE_ID, STORE_ID)).thenReturn(false);
        when(employeeRepository.findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(EMPLOYEE_ID, STORE_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> policy.assertMasterOrManagerPermission(
                EMPLOYEE_ID, STORE_ID, ManagerPermission.ATTENDANCE_APPROVE))
                .isInstanceOfSatisfying(ManagerAccessDeniedException.class,
                        error -> assertThat(error.getCode()).isEqualTo("MGR-001"));
    }

    // ── assertMasterOrManagerOwnsTimeOff ──────────────────────────

    @Test
    void masterOrManagerOwnsTimeOff_masterPasses() {
        Store store = storeWithId(STORE_ID);
        TimeOff timeOff = new TimeOff();
        timeOff.setStore(store);
        when(timeOffRepository.findById(100L)).thenReturn(Optional.of(timeOff));
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);

        assertThatCode(() -> policy.assertMasterOrManagerOwnsTimeOff(
                MASTER_ID, 100L, ManagerPermission.TIMEOFF_APPROVE)).doesNotThrowAnyException();
    }

    @Test
    void masterOrManagerOwnsTimeOff_missingStore_throws() {
        TimeOff timeOff = new TimeOff();
        when(timeOffRepository.findById(100L)).thenReturn(Optional.of(timeOff));

        assertThatThrownBy(() -> policy.assertMasterOrManagerOwnsTimeOff(
                MASTER_ID, 100L, ManagerPermission.TIMEOFF_APPROVE))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── isMasterOwner / delegation flags ──────────────────────────

    @Test
    void isMasterOwner_true() {
        when(masterRepository.existsByMasterProfile_IdAndStore_Id(MASTER_ID, STORE_ID)).thenReturn(true);
        assertThat(policy.isMasterOwner(MASTER_ID, STORE_ID)).isTrue();
    }

    @Test
    void isMasterOwner_nullArgs_falseWithoutRepositoryCall() {
        assertThat(policy.isMasterOwner(null, STORE_ID)).isFalse();
        assertThat(policy.isMasterOwner(MASTER_ID, null)).isFalse();
        verifyNoInteractions(masterRepository);
    }

    @Test
    void managerDelegationEnabled_flagReflectsConstructorValue() {
        assertThat(policy.isManagerDelegationEnabled()).isTrue();
        assertThatCode(() -> policy.assertManagerDelegationEnabled()).doesNotThrowAnyException();

        StoreAuthorizationPolicy disabled = new StoreAuthorizationPolicy(
                masterRepository, employeeRepository, timeOffRepository, planAccessService, false);
        assertThat(disabled.isManagerDelegationEnabled()).isFalse();
        assertThatThrownBy(disabled::assertManagerDelegationEnabled)
                .isInstanceOf(ManagerAccessDeniedException.class);
    }

    // ── null 방어 ──────────────────────────────────────────────────

    @Test
    void nullPrincipal_throwsAccessDenied() {
        assertThatThrownBy(() -> policy.assertMasterOwnsStore(null, STORE_ID))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.assertEmployeeInStore(EMPLOYEE_ID, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.assertSelf(null, EMPLOYEE_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────

    private Store storeWithId(Long id) {
        Store store = new Store("테스트매장", "1234567890", "010-0000-0000", "카페", 12_000, 100);
        ReflectionTestUtils.setField(store, "id", id);
        return store;
    }

    private EmployeeStoreRelation activeManager(java.util.Set<ManagerPermission> permissions) {
        EmployeeStoreRelation relation = new EmployeeStoreRelation();
        relation.draftManagerAppointment(permissions, LocalDateTime.now());
        relation.activateManagerDelegation(88L, relation.getManagerDelegationVersion(), LocalDateTime.now());
        return relation;
    }

    private void assertManagerCode(Long userId, Long storeId, ManagerPermission permission, String code) {
        assertThatThrownBy(() -> policy.assertManagerPermission(userId, storeId, permission))
                .isInstanceOfSatisfying(ManagerAccessDeniedException.class,
                        error -> assertThat(error.getCode()).isEqualTo(code));
    }
}
