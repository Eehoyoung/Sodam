package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.StoreDelegationAudit;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.StoreRole;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.exception.ManagerAccessDeniedException;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StoreManagerService {

    private static final long MAX_ACTIVE_MANAGERS = 2L;

    private final StoreAccessGuard guard;
    private final PlanAccessService planAccessService;
    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final StoreDelegationAuditRepository auditRepository;

    @Transactional
    public EmployeeStoreRelation draftAppointment(Long masterId, Long storeId, Long employeeId,
                                                   Set<ManagerPermission> permissions) {
        guard.assertMasterOwnsStore(masterId, storeId);
        guard.assertManagerDelegationEnabled();
        if (!planAccessService.storeOwnerHasFeature(storeId, PlanFeature.MANAGER_DELEGATION)) {
            throw ManagerAccessDeniedException.subscriptionFrozen();
        }
        storeRepository.findByIdForUpdate(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        EmployeeStoreRelation relation = relationRepository.findRelationForUpdate(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("활성 직원-매장 관계를 찾을 수 없습니다."));
        if (!Boolean.TRUE.equals(relation.getIsActive())) {
            throw new IllegalStateException("비활성 직원은 매니저로 임명할 수 없습니다.");
        }
        long managerCount = relationRepository.countByStore_IdAndStoreRoleAndIsActiveTrue(storeId, StoreRole.MANAGER);
        if (relation.getStoreRole() != StoreRole.MANAGER && managerCount >= MAX_ACTIVE_MANAGERS) {
            throw new IllegalStateException("매장당 매니저는 최대 2명입니다.");
        }
        Set<ManagerPermission> requested = permissions == null || permissions.isEmpty()
                ? ManagerPermission.defaultPreset() : permissions;
        relation.draftManagerAppointment(requested, LocalDateTime.now());
        EmployeeStoreRelation saved = relationRepository.save(relation);
        auditRepository.save(StoreDelegationAudit.of(storeId, employeeId, masterId, masterId,
                StoreDelegationAudit.ActorType.MASTER, StoreDelegationAudit.Action.GRANT_DRAFTED,
                saved.getGrantedPermissions(), saved.getManagerDelegationVersion(), null, null, null));
        return saved;
    }

    @Transactional
    public EmployeeStoreRelation activateSignedDelegationByRelationId(Long storeId, Long relationId, Long envelopeId,
                                                                      int delegationVersion, String documentSha256) {
        guard.assertManagerDelegationEnabled();
        storeRepository.findByIdForUpdate(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        EmployeeStoreRelation relation = relationRepository.findByIdForUpdate(relationId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        if (relation.getStore() == null || !storeId.equals(relation.getStore().getId())) {
            throw new org.springframework.security.access.AccessDeniedException("전자서명 위임 대상 매장이 일치하지 않습니다.");
        }
        relation.activateManagerDelegation(envelopeId, delegationVersion, LocalDateTime.now());
        EmployeeStoreRelation saved = relationRepository.save(relation);
        auditRepository.save(StoreDelegationAudit.of(storeId, relation.getEmployeeProfile().getId(), null, null,
                StoreDelegationAudit.ActorType.SYSTEM, StoreDelegationAudit.Action.ACTIVATED,
                saved.getGrantedPermissions(), saved.getManagerDelegationVersion(), envelopeId,
                documentSha256, null));
        return saved;
    }

    @Transactional
    public PermissionChangeDraft changePermissions(Long masterId, Long storeId, Long employeeId,
                                                   Set<ManagerPermission> requested) {
        guard.assertMasterOwnsStore(masterId, storeId);
        if (!planAccessService.storeOwnerHasFeature(storeId, PlanFeature.MANAGER_DELEGATION)) {
            throw ManagerAccessDeniedException.subscriptionFrozen();
        }
        storeRepository.findByIdForUpdate(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        EmployeeStoreRelation relation = relationRepository.findRelationForUpdate(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        if (requested == null || requested.isEmpty()) throw new IllegalArgumentException("권한은 1개 이상이어야 합니다.");

        if (relation.getGrantedPermissions().equals(requested)
                && relation.getPendingManagerDelegationVersion() == null) {
            return new PermissionChangeDraft(relation, false, relation.getManagerDelegationVersion());
        }

        if (relation.getGrantedPermissions().containsAll(requested)) {
            relation.reduceManagerPermissions(requested);
            relationRepository.save(relation);
            auditRepository.save(StoreDelegationAudit.of(storeId, employeeId, masterId, masterId,
                    StoreDelegationAudit.ActorType.MASTER, StoreDelegationAudit.Action.MODIFIED,
                    relation.getGrantedPermissions(), relation.getManagerDelegationVersion(),
                    relation.getManagerSignatureEnvelopeId(), null, "권한 축소 즉시 적용"));
            return new PermissionChangeDraft(relation, false, relation.getManagerDelegationVersion());
        }

        guard.assertManagerDelegationEnabled();
        int pendingVersion = relation.stageManagerPermissionChange(requested, LocalDateTime.now());
        relationRepository.save(relation);
        auditRepository.save(StoreDelegationAudit.of(storeId, employeeId, masterId, masterId,
                StoreDelegationAudit.ActorType.MASTER, StoreDelegationAudit.Action.EXPANSION_STAGED,
                requested, pendingVersion, null, null, "권한 확대 서명 대기"));
        return new PermissionChangeDraft(relation, true, pendingVersion);
    }

    @Transactional
    public void cancelPendingPermissionChange(Long masterId, Long storeId, Long employeeId) {
        guard.assertMasterOwnsStore(masterId, storeId);
        EmployeeStoreRelation relation = relationRepository.findRelationForUpdate(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        relation.clearPendingManagerPermissionChange();
    }

    public record PermissionChangeDraft(EmployeeStoreRelation relation, boolean signatureRequired, int version) {}

    @Transactional
    public void revoke(Long masterId, Long storeId, Long employeeId, String reason) {
        guard.assertMasterOwnsStore(masterId, storeId);
        storeRepository.findByIdForUpdate(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));
        EmployeeStoreRelation relation = relationRepository.findRelationForUpdate(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        Set<ManagerPermission> snapshot = relation.getGrantedPermissions();
        int version = relation.getManagerDelegationVersion();
        Long envelopeId = relation.getManagerSignatureEnvelopeId();
        relation.revokeManager();
        relationRepository.save(relation);
        auditRepository.save(StoreDelegationAudit.of(storeId, employeeId, masterId, masterId,
                StoreDelegationAudit.ActorType.MASTER, StoreDelegationAudit.Action.REVOKED,
                snapshot, version, envelopeId, null, reason));
    }

    @Transactional(readOnly = true)
    public List<EmployeeStoreRelation> listManagers(Long masterId, Long storeId) {
        guard.assertMasterOwnsStore(masterId, storeId);
        return relationRepository.findByStore_IdAndStoreRoleAndIsActiveTrue(storeId, StoreRole.MANAGER);
    }
}
