package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** 고위험 행위 시 현재 매장 관계와 완료된 위임 version을 한 번에 재검증한다. */
@Service
@RequiredArgsConstructor
public class DelegatedActionAuthorityService {
    private final StoreAccessGuard guard;
    private final EmployeeStoreRelationRepository relationRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    @Value("${sodam.features.manager-contract-signing-enabled:false}")
    private boolean managerContractSigningEnabled;

    public Authority requireContract(Long actorUserId, Long storeId) {
        Authority authority = require(actorUserId, storeId, ManagerPermission.CONTRACT_MANAGE);
        if (!authority.owner() && !managerContractSigningEnabled) {
            throw new AccessDeniedException("대리 근로계약 체결은 법무 승인 후 활성화됩니다.");
        }
        return authority;
    }

    public Authority require(Long actorUserId, Long storeId, ManagerPermission permission) {
        if (guard.isMasterOwner(actorUserId, storeId)) {
            return new Authority(actorUserId, actorUserId, true, null, 0,
                    EnumSet.noneOf(ManagerPermission.class));
        }
        guard.assertManagerPermission(actorUserId, storeId, permission);
        EmployeeStoreRelation relation = relationRepository
                .findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(actorUserId, storeId)
                .orElseThrow(com.rich.sodam.exception.ManagerAccessDeniedException::permissionDenied);
        Long ownerId = masterStoreRelationRepository.findFirstByStore_IdOrderByIdAsc(storeId)
                .map(r -> r.getMasterProfile().getId())
                .orElseThrow(() -> new IllegalStateException("매장 사업주 관계가 없습니다."));
        return new Authority(actorUserId, ownerId, false, relation.getManagerSignatureEnvelopeId(),
                relation.getManagerDelegationVersion(), relation.getGrantedPermissions());
    }

    /** 계약 최종 확정 직전에 현재 위임 관계를 잠그고 발급 당시 권한 근거와 다시 대조한다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void revalidateContractEnvelope(ElectronicSignatureEnvelope envelope) {
        if (envelope == null || envelope.getSubjectType() != SignatureSubjectType.LABOR_CONTRACT) {
            throw new IllegalArgumentException("근로계약 전자서명 봉투가 필요합니다.");
        }
        if (envelope.getAuthorityEnvelopeId() == null) {
            guard.assertMasterOwnsStore(envelope.getCreatedByUserId(), envelope.getStoreId());
            return;
        }
        if (!managerContractSigningEnabled || !guard.isManagerDelegationEnabled()) {
            throw new AccessDeniedException("대리 근로계약 체결 권한이 비활성화되었습니다.");
        }
        Long actorUserId = envelope.getSigningActorUserId();
        guard.assertManagerPermission(actorUserId, envelope.getStoreId(), ManagerPermission.CONTRACT_MANAGE);
        EmployeeStoreRelation relation = relationRepository
                .findRelationForUpdate(actorUserId, envelope.getStoreId())
                .orElseThrow(com.rich.sodam.exception.ManagerAccessDeniedException::permissionDenied);
        if (!relation.hasActiveManagerPermission(ManagerPermission.CONTRACT_MANAGE)
                || !Objects.equals(relation.getManagerSignatureEnvelopeId(), envelope.getAuthorityEnvelopeId())
                || relation.getManagerDelegationVersion() != envelope.getAuthorityVersion()) {
            throw new AccessDeniedException("발급 당시 위임 권한이 더 이상 유효하지 않습니다.");
        }
        Long currentOwnerId = masterStoreRelationRepository.findFirstByStore_IdOrderByIdAsc(envelope.getStoreId())
                .map(r -> r.getMasterProfile().getId())
                .orElseThrow(() -> new IllegalStateException("매장 사업주 관계가 없습니다."));
        if (!Objects.equals(currentOwnerId, envelope.getDelegatedByMasterId())) {
            throw new AccessDeniedException("발급 당시 사업주 권한 근거가 더 이상 유효하지 않습니다.");
        }
    }

    public record Authority(Long actorUserId, Long ownerUserId, boolean owner,
                            Long delegationEnvelopeId, int delegationVersion,
                            Set<ManagerPermission> permissions) {
        public Authority {
            permissions = permissions == null || permissions.isEmpty()
                    ? EnumSet.noneOf(ManagerPermission.class) : EnumSet.copyOf(permissions);
        }
    }
}
