package com.rich.sodam.service;

import com.rich.sodam.config.integration.PushNotifier;
import com.rich.sodam.core.electronicsignature.SignerIdentity;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignaturePartyStatus;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ManagerDelegationService {
    private final StoreManagerService storeManagerService;
    private final ManagerDelegationDocumentService documentService;
    private final ElectronicSignatureApplicationService signatureService;
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final ElectronicSignatureOutboxRepository outboxRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final StoreDelegationAuditRepository auditRepository;
    private final UserRepository userRepository;
    private final StoreAccessGuard guard;
    private final NotificationService notificationService;

    public ElectronicSignatureEnvelope appoint(Long masterId, Long storeId, Long employeeId,
                                                Set<ManagerPermission> permissions) {
        guard.assertMasterOwnsStore(masterId, storeId);
        validateSignerProfile(masterId);
        validateSignerProfile(employeeId);
        EmployeeStoreRelation relation = storeManagerService.draftAppointment(masterId, storeId, employeeId, permissions);
        byte[] pdf = documentService.render(storeId, masterId, employeeId,
                relation.getManagerDelegationVersion(), relation.getGrantedPermissions());
        try {
            ElectronicSignatureEnvelope envelope = signatureService.createManagerDelegation(
                    masterId, relation.getId(), storeId, employeeId,
                    relation.getManagerDelegationVersion(), pdf);
            notificationService.push(employeeId, PushNotifier.PushMessage.builder()
                    .title("매니저 권한 위임 서명 요청")
                    .body("권한 위임 문서를 확인하고 전자서명을 완료해 주세요.")
                    .deepLink("sodam://e-sign/" + envelope.getId())
                    .data(Map.of("type", "MANAGER_DELEGATION_SIGN"))
                    .build());
            return envelope;
        } catch (RuntimeException e) {
            storeManagerService.revoke(masterId, storeId, employeeId, "전자서명 envelope 생성 실패");
            throw e;
        }
    }

    public void revoke(Long masterId, Long storeId, Long employeeId, String reason) {
        guard.assertMasterOwnsStore(masterId, storeId);
        EmployeeStoreRelation relation = relationRepository.findByEmployeeProfile_IdAndStore_Id(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        Long authorityEnvelopeId = relation.getManagerSignatureEnvelopeId();
        storeManagerService.revoke(masterId, storeId, employeeId, reason);
        cancelPendingEnvelope(relation.getId());
        cancelDependentContractEnvelopes(authorityEnvelopeId);
        notificationService.push(employeeId, PushNotifier.PushMessage.builder()
                .title("매니저 권한 종료")
                .body("매장 운영 권한 위임이 종료됐습니다.")
                .deepLink("sodam://home")
                .data(Map.of("type", "MANAGER_DELEGATION_REVOKED"))
                .build());
    }

    public PermissionUpdateView updatePermissions(Long masterId, Long storeId, Long employeeId,
                                                  Set<ManagerPermission> permissions) {
        guard.assertMasterOwnsStore(masterId, storeId);
        EmployeeStoreRelation current = relationRepository
                .findByEmployeeProfile_IdAndStore_Id(employeeId, storeId)
                .orElseThrow(() -> new EntityNotFoundException("직원-매장 관계를 찾을 수 없습니다."));
        Long authorityEnvelopeId = current.getManagerSignatureEnvelopeId();
        boolean contractPermissionRemoved = current.getGrantedPermissions().contains(ManagerPermission.CONTRACT_MANAGE)
                && (permissions == null || !permissions.contains(ManagerPermission.CONTRACT_MANAGE));
        if (current.getPendingManagerDelegationVersion() != null) {
            ElectronicSignatureEnvelope latest = latestDelegationEnvelope(current);
            if (latest != null && !latest.getStatus().terminal()) {
                throw new IllegalStateException("진행 중인 권한 확대 전자서명을 먼저 완료하거나 취소해야 합니다.");
            }
        }
        StoreManagerService.PermissionChangeDraft draft =
                storeManagerService.changePermissions(masterId, storeId, employeeId, permissions);
        if (!draft.signatureRequired()) {
            cancelPendingEnvelope(draft.relation().getId());
            if (contractPermissionRemoved) cancelDependentContractEnvelopes(authorityEnvelopeId);
            notificationService.push(employeeId, PushNotifier.PushMessage.builder()
                    .title("매니저 권한이 변경됐어요")
                    .body("사업주가 위임 권한 범위를 축소했습니다.")
                    .deepLink("sodam://home")
                    .data(Map.of("type", "MANAGER_PERMISSION_REDUCED"))
                    .build());
            return new PermissionUpdateView(false, null, draft.version(), draft.relation().getGrantedPermissions());
        }

        byte[] pdf = documentService.render(storeId, masterId, employeeId, draft.version(), permissions);
        try {
            ElectronicSignatureEnvelope envelope = signatureService.createManagerDelegation(
                    masterId, draft.relation().getId(), storeId, employeeId, draft.version(), pdf);
            return new PermissionUpdateView(true, envelope.getId(), draft.version(), permissions);
        } catch (RuntimeException e) {
            storeManagerService.cancelPendingPermissionChange(masterId, storeId, employeeId);
            throw e;
        }
    }

    private void cancelPendingEnvelope(Long relationId) {
        envelopeRepository.findFirstBySubjectTypeAndSubjectIdOrderByDocumentVersionDesc(
                SignatureSubjectType.MANAGER_DELEGATION, relationId).ifPresent(envelope -> {
            cancelEnvelope(envelope);
        });
    }

    private void cancelDependentContractEnvelopes(Long authorityEnvelopeId) {
        if (authorityEnvelopeId == null) return;
        envelopeRepository.findByAuthorityEnvelopeId(authorityEnvelopeId).forEach(this::cancelEnvelope);
    }

    private void cancelEnvelope(ElectronicSignatureEnvelope envelope) {
        if (envelope.getStatus().terminal()) return;
        List<com.rich.sodam.domain.ElectronicSignatureParty> parties =
                partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelope.getId());
        parties.forEach(p -> {
            if (!p.getStatus().terminal()) p.terminate(SignaturePartyStatus.CANCELLED);
        });
        partyRepository.saveAll(parties);
        List<com.rich.sodam.domain.ElectronicSignatureOutbox> outboxes =
                outboxRepository.findByEnvelopeId(envelope.getId());
        outboxes.forEach(com.rich.sodam.domain.ElectronicSignatureOutbox::cancel);
        outboxRepository.saveAll(outboxes);
        envelope.fail(SignatureEnvelopeStatus.CANCELLED);
        envelopeRepository.save(envelope);
    }

    @Transactional(readOnly = true)
    public List<ManagerView> managers(Long masterId, Long storeId) {
        return storeManagerService.listManagers(masterId, storeId).stream().map(this::toManagerView).toList();
    }

    @Transactional(readOnly = true)
    public List<ManagedStoreView> managedStores(Long employeeId) {
        if (!guard.isManagerDelegationEnabled()) return List.of();
        return relationRepository.findByEmployeeProfile_IdAndStoreRoleAndIsActiveTrue(
                employeeId, com.rich.sodam.domain.type.StoreRole.MANAGER).stream()
                .map(this::toManagedStoreView).toList();
    }

    private ManagerView toManagerView(EmployeeStoreRelation relation) {
        ElectronicSignatureEnvelope envelope = latestDelegationEnvelope(relation);
        return new ManagerView(relation.getEmployeeProfile().getId(), relation.getGrantedPermissions(),
                relation.getManagerDelegationVersion(), relation.getManagerAppointedAt(),
                relation.getManagerAcceptedAt(), envelope == null ? null : envelope.getId(),
                envelope == null ? null : envelope.getStatus(), relation.getManagerAcceptedAt() != null,
                relation.getPendingManagerPermissions(), relation.getPendingManagerDelegationVersion());
    }

    private ManagedStoreView toManagedStoreView(EmployeeStoreRelation relation) {
        ElectronicSignatureEnvelope envelope = latestDelegationEnvelope(relation);
        return new ManagedStoreView(relation.getStore().getId(), relation.getStore().getStoreName(),
                relation.getGrantedPermissions(), relation.getManagerDelegationVersion(),
                relation.getManagerAcceptedAt(), envelope == null ? null : envelope.getId(),
                envelope == null ? null : envelope.getStatus(), relation.getManagerAcceptedAt() != null);
    }

    private ElectronicSignatureEnvelope latestDelegationEnvelope(EmployeeStoreRelation relation) {
        return envelopeRepository.findFirstBySubjectTypeAndSubjectIdOrderByDocumentVersionDesc(
                SignatureSubjectType.MANAGER_DELEGATION, relation.getId()).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<AuditView> audit(Long masterId, Long storeId, int page, int size) {
        guard.assertMasterOwnsStore(masterId, storeId);
        // 3년 보존 이력이라 무한 성장 — 페이지 단위로만 내려준다 (응답 형태는 List 유지, FE 계약 불변).
        return auditRepository.findByStoreIdOrderByCreatedAtDesc(
                        storeId, org.springframework.data.domain.PageRequest.of(page, size)).stream()
                .map(a -> new AuditView(a.getAction().name(), a.getEmployeeId(), a.getActorType().name(),
                        a.getPermissionsSnapshot(), a.getDelegationVersion(), a.getSignatureEnvelopeId(),
                        a.getDocumentSha256(), a.getReason(), a.getCreatedAt())).toList();
    }

    private void validateSignerProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 사용자를 찾을 수 없습니다."));
        if (user.getPhone() == null || user.getBirthDate() == null) {
            throw new IllegalArgumentException("전자서명 전에 휴대전화와 생년월일 프로필을 완성해야 합니다.");
        }
        new SignerIdentity(user.getName(), user.getPhone(), user.getBirthDate().toString().replace("-", ""));
    }

    public record ManagerView(Long employeeId, Set<ManagerPermission> permissions, int delegationVersion,
                              java.time.LocalDateTime appointedAt, java.time.LocalDateTime acceptedAt,
                              Long signatureEnvelopeId, SignatureEnvelopeStatus signatureStatus, boolean active,
                              Set<ManagerPermission> pendingPermissions, Integer pendingVersion) {}
    public record ManagedStoreView(Long storeId, String storeName, Set<ManagerPermission> permissions,
                                   int delegationVersion, java.time.LocalDateTime acceptedAt,
                                   Long signatureEnvelopeId, SignatureEnvelopeStatus signatureStatus,
                                   boolean active) {}
    public record PermissionUpdateView(boolean signatureRequired, Long envelopeId, int delegationVersion,
                                       Set<ManagerPermission> permissions) {}
    public record AuditView(String action, Long employeeId, String actorType, Set<ManagerPermission> permissions,
                            int delegationVersion, Long signatureEnvelopeId, String documentSha256,
                            String reason, java.time.LocalDateTime createdAt) {}
}
