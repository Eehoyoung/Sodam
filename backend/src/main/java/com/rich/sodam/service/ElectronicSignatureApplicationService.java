package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.*;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ElectronicSignatureApplicationService {
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final ElectronicSignatureOutboxRepository outboxRepository;
    private final PrivateSignatureObjectStorage storage;
    private final SensitiveReferenceCrypto crypto;
    private final IntegrationProperties integrationProperties;
    private final StoreAccessGuard guard;
    private final TransactionTemplate transactions;
    private final ElectronicSignatureCertificateService certificateService;
    private final ElectronicSignatureAccessAuditService accessAuditService;

    public ElectronicSignatureEnvelope createManagerDelegation(Long masterId, Long relationId, Long storeId,
                                                                 Long managerUserId, int documentVersion,
                                                                 byte[] finalizedPdf) {
        requireIssuanceEnabled();
        guard.assertMasterOwnsStore(masterId, storeId);
        DocumentDigest digest = DocumentDigest.sha256(finalizedPdf);
        String rawRef = storage.put(PrivateSignatureObjectStorage.ObjectKind.UNSIGNED_PDF, relationId,
                new ByteArrayInputStream(finalizedPdf), finalizedPdf.length, "application/pdf");
        try {
            return transactions.execute(status -> persistManagerDelegation(
                    masterId, relationId, storeId, managerUserId, documentVersion, digest, rawRef));
        } catch (RuntimeException e) {
            storage.delete(rawRef);
            throw e;
        }
    }

    public ElectronicSignatureEnvelope createLaborContract(DelegatedActionAuthorityService.Authority authority,
                                                             Long contractId, Long storeId,
                                                             Long employeeUserId, int documentVersion,
                                                             byte[] finalizedPdf) {
        requireIssuanceEnabled();
        if (authority == null) throw new IllegalArgumentException("계약 체결 권한이 필요합니다.");
        if (authority.owner()) guard.assertMasterOwnsStore(authority.actorUserId(), storeId);
        else guard.assertManagerPermission(authority.actorUserId(), storeId, ManagerPermission.CONTRACT_MANAGE);
        DocumentDigest digest = DocumentDigest.sha256(finalizedPdf);
        String rawRef = storage.put(PrivateSignatureObjectStorage.ObjectKind.UNSIGNED_PDF, contractId,
                new ByteArrayInputStream(finalizedPdf), finalizedPdf.length, "application/pdf");
        try {
            return transactions.execute(status -> {
                ElectronicSignatureEnvelope envelope = envelopeRepository.save(ElectronicSignatureEnvelope.create(
                        SignatureSubjectType.LABOR_CONTRACT, contractId, storeId, documentVersion,
                        digest.hex(), crypto.encrypt(rawRef), authority.actorUserId()));
                if (!authority.owner()) {
                    envelope.bindDelegatedAuthority(authority.actorUserId(), authority.ownerUserId(),
                            authority.delegationEnvelopeId(), authority.delegationVersion());
                }
                ElectronicSignatureProvider provider = ElectronicSignatureProvider.parse(
                        integrationProperties.getElectronicSignature().getProvider());
                ElectronicSignatureParty owner = partyRepository.save(ElectronicSignatureParty.waiting(
                        envelope, authority.owner() ? SignatureSignerRole.OWNER : SignatureSignerRole.MANAGER,
                        authority.actorUserId(), 1, provider));
                partyRepository.save(ElectronicSignatureParty.waiting(
                        envelope, SignatureSignerRole.EMPLOYEE, employeeUserId, 2, provider));
                owner.queueRequest();
                envelope.markInProgress();
                outboxRepository.save(ElectronicSignatureOutbox.queue(
                        envelope.getId(), owner.getId(), SignatureOperation.REQUEST,
                        "request:" + owner.getId(), LocalDateTime.now()));
                return envelope;
            });
        } catch (RuntimeException e) {
            storage.delete(rawRef);
            throw e;
        }
    }

    public ElectronicSignatureEnvelope createEmploymentAmendment(Long requesterId, Long ownerUserId,
                                                                  Long amendmentId, Long storeId,
                                                                  Long employeeUserId, int documentVersion,
                                                                  byte[] finalizedPdf) {
        requireIssuanceEnabled();
        guard.assertMasterOrManagerPermission(requesterId, storeId, ManagerPermission.WAGE_EDIT);
        DocumentDigest digest = DocumentDigest.sha256(finalizedPdf);
        String rawRef = storage.put(PrivateSignatureObjectStorage.ObjectKind.UNSIGNED_PDF, amendmentId,
                new ByteArrayInputStream(finalizedPdf), finalizedPdf.length, "application/pdf");
        try {
            return transactions.execute(status -> {
                ElectronicSignatureEnvelope envelope = envelopeRepository.save(ElectronicSignatureEnvelope.create(
                        SignatureSubjectType.LABOR_CONTRACT_AMENDMENT, amendmentId, storeId, documentVersion,
                        digest.hex(), crypto.encrypt(rawRef), requesterId));
                ElectronicSignatureProvider provider = ElectronicSignatureProvider.parse(
                        integrationProperties.getElectronicSignature().getProvider());
                ElectronicSignatureParty owner = partyRepository.save(ElectronicSignatureParty.waiting(
                        envelope, SignatureSignerRole.OWNER, ownerUserId, 1, provider));
                partyRepository.save(ElectronicSignatureParty.waiting(
                        envelope, SignatureSignerRole.EMPLOYEE, employeeUserId, 2, provider));
                owner.queueRequest();
                envelope.markInProgress();
                outboxRepository.save(ElectronicSignatureOutbox.queue(
                        envelope.getId(), owner.getId(), SignatureOperation.REQUEST,
                        "request:" + owner.getId(), LocalDateTime.now()));
                return envelope;
            });
        } catch (RuntimeException e) {
            storage.delete(rawRef);
            throw e;
        }
    }

    private ElectronicSignatureEnvelope persistManagerDelegation(Long masterId, Long relationId, Long storeId,
                                                                   Long managerUserId, int documentVersion,
                                                                   DocumentDigest digest, String rawRef) {
            ElectronicSignatureEnvelope envelope = envelopeRepository.save(ElectronicSignatureEnvelope.create(
                    SignatureSubjectType.MANAGER_DELEGATION, relationId, storeId, documentVersion,
                    digest.hex(), crypto.encrypt(rawRef), masterId));
            ElectronicSignatureProvider provider = ElectronicSignatureProvider.parse(
                    integrationProperties.getElectronicSignature().getProvider());
            ElectronicSignatureParty owner = partyRepository.save(ElectronicSignatureParty.waiting(
                    envelope, SignatureSignerRole.OWNER, masterId, 1, provider));
            partyRepository.save(ElectronicSignatureParty.waiting(
                    envelope, SignatureSignerRole.MANAGER, managerUserId, 2, provider));
            owner.queueRequest();
            envelope.markInProgress();
            outboxRepository.save(ElectronicSignatureOutbox.queue(
                    envelope.getId(), owner.getId(), SignatureOperation.REQUEST,
                    "request:" + owner.getId(), LocalDateTime.now()));
            return envelope;
    }

    @Transactional(readOnly = true)
    public EnvelopeView getAuthorized(Long userId, Long envelopeId) {
        ElectronicSignatureEnvelope envelope = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 요청을 찾을 수 없습니다."));
        assertEnvelopeAccess(userId, envelope);
        List<ElectronicSignatureParty> parties = partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId);
        return EnvelopeView.of(envelope, parties, userId);
    }

    @Transactional
    public void queueSigningRequest(Long userId, Long envelopeId) {
        requireIssuanceEnabled();
        ElectronicSignatureEnvelope envelope = envelopeRepository.findByIdForUpdate(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 요청을 찾을 수 없습니다."));
        assertEnvelopeAccess(userId, envelope);
        ElectronicSignatureParty party = partyRepository
                .findByEnvelope_IdAndSigningOrder(envelopeId, envelope.getCurrentSigningOrder())
                .orElseThrow(() -> new EntityNotFoundException("현재 서명자를 찾을 수 없습니다."));
        if (!userId.equals(party.getUserId())) throw new org.springframework.security.access.AccessDeniedException("현재 서명 순번이 아닙니다.");
        if (party.getStatus() == SignaturePartyStatus.WAITING) party.queueRequest();
        if (party.getStatus() != SignaturePartyStatus.REQUEST_QUEUED) return;
        String key = "request:" + party.getId();
        if (!outboxRepository.existsByIdempotencyKey(key)) {
            outboxRepository.save(ElectronicSignatureOutbox.queue(
                    envelopeId, party.getId(), SignatureOperation.REQUEST, key, LocalDateTime.now()));
        }
    }

    @Transactional
    public void queueRefresh(Long userId, Long envelopeId) {
        requireIssuanceEnabled();
        ElectronicSignatureEnvelope envelope = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 요청을 찾을 수 없습니다."));
        assertEnvelopeAccess(userId, envelope);
        ElectronicSignatureParty party = partyRepository
                .findByEnvelope_IdAndSigningOrder(envelopeId, envelope.getCurrentSigningOrder())
                .orElseThrow(() -> new EntityNotFoundException("현재 서명자를 찾을 수 없습니다."));
        if (party.getStatus() != SignaturePartyStatus.PENDING) return;
        outboxRepository.save(ElectronicSignatureOutbox.queue(envelopeId, party.getId(), SignatureOperation.STATUS,
                "status:" + party.getId() + ":" + UUID.randomUUID(), LocalDateTime.now()));
    }

    @Transactional(readOnly = true)
    public DocumentStream openDocument(Long userId, Long envelopeId) {
        ElectronicSignatureEnvelope envelope = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 요청을 찾을 수 없습니다."));
        try {
            assertEnvelopeAccess(userId, envelope);
            if (envelope.getUnsignedObjectRefEnc() == null) {
                throw new IllegalStateException("보존기간이 만료되어 전자서명 원문이 파기되었습니다.");
            }
            DocumentStream result = new DocumentStream(
                    storage.open(crypto.decrypt(envelope.getUnsignedObjectRefEnc())),
                    envelope.getDocumentSha256(), "application/pdf");
            accessAuditService.record(envelopeId, userId, "DOCUMENT", "GRANTED");
            return result;
        } catch (org.springframework.security.access.AccessDeniedException e) {
            accessAuditService.record(envelopeId, userId, "DOCUMENT", "DENIED");
            throw e;
        } catch (RuntimeException e) {
            accessAuditService.record(envelopeId, userId, "DOCUMENT", "ERROR");
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public DocumentStream completionCertificate(Long userId, Long envelopeId) {
        ElectronicSignatureEnvelope envelope = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 요청을 찾을 수 없습니다."));
        try {
            assertEnvelopeAccess(userId, envelope);
            if (envelope.getStatus() != SignatureEnvelopeStatus.VERIFIED) {
                throw new IllegalStateException("전자서명이 아직 완료되지 않았습니다.");
            }
            byte[] pdf = certificateService.render(
                    envelope, partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId));
            accessAuditService.record(envelopeId, userId, "COMPLETION_CERTIFICATE", "GRANTED");
            return new DocumentStream(
                    new ByteArrayInputStream(pdf), DocumentDigest.sha256(pdf).hex(), "application/pdf");
        } catch (org.springframework.security.access.AccessDeniedException e) {
            accessAuditService.record(envelopeId, userId, "COMPLETION_CERTIFICATE", "DENIED");
            throw e;
        } catch (RuntimeException e) {
            accessAuditService.record(envelopeId, userId, "COMPLETION_CERTIFICATE", "ERROR");
            throw e;
        }
    }

    private void assertEnvelopeAccess(Long userId, ElectronicSignatureEnvelope envelope) {
        if (partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelope.getId()).stream()
                .anyMatch(p -> userId.equals(p.getUserId()))) return;
        guard.assertMasterOwnsStore(userId, envelope.getStoreId());
    }

    private void requireIssuanceEnabled() {
        IntegrationProperties.ElectronicSignature config = integrationProperties.getElectronicSignature();
        if (config.resolvedMode() == IntegrationProperties.Mode.OFF || !config.isWorkerEnabled()) {
            throw new IllegalStateException("전자서명 발급 기능이 비활성화되어 있습니다.");
        }
    }

    public record PartyView(SignatureSignerRole role, int order, SignaturePartyStatus status,
                            LocalDateTime requestedAt, LocalDateTime verifiedAt, LocalDateTime expiresAt) {}
    public record EnvelopeView(Long id, SignatureSubjectType subjectType, Long subjectId, Long storeId,
                               int documentVersion, String documentSha256, SignatureEnvelopeStatus status,
                               int currentSigningOrder, Integer viewerPartyOrder, List<PartyView> parties) {
        static EnvelopeView of(ElectronicSignatureEnvelope e, List<ElectronicSignatureParty> parties, Long viewerId) {
            Integer viewerOrder = parties.stream()
                    .filter(p -> viewerId.equals(p.getUserId()))
                    .map(ElectronicSignatureParty::getSigningOrder)
                    .findFirst().orElse(null);
            return new EnvelopeView(e.getId(), e.getSubjectType(), e.getSubjectId(), e.getStoreId(),
                    e.getDocumentVersion(), e.getDocumentSha256(), e.getStatus(), e.getCurrentSigningOrder(), viewerOrder,
                    parties.stream().map(p -> new PartyView(p.getSignerRole(), p.getSigningOrder(), p.getStatus(),
                            p.getRequestedAt(), p.getVerifiedAt(), p.getExpiresAt())).toList());
        }
    }
    public record DocumentStream(java.io.InputStream stream, String sha256, String contentType) {}
}
