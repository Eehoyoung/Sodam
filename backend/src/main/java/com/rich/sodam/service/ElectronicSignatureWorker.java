package com.rich.sodam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.*;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

/**
 * BaroCert request → status polling → verify를 DB outbox lease로 직렬화한다.
 *
 * <p><b>트랜잭션 경계</b>: {@link #runDueWork()}는 {@code com.rich.sodam.service} 전역 트랜잭션
 * advisor({@code TransactionAspect})에 의해 이미 하나의 물리 트랜잭션으로 감싸여 있다. 이 안에서
 * {@link #processOne(Long)}가 {@code transactions.execute(...)}로 outbox 항목별 "독립 트랜잭션"을
 * 의도하지만, {@link TransactionTemplate}의 기본 전파({@code PROPAGATION_REQUIRED})는 이미 열려있는
 * advisor의 외부 트랜잭션에 그대로 참여해버려 항목 A의 실패가 rollback-only 마킹을 남기고, 이후
 * 처리된 항목 B까지 루프 종료 시점의 커밋에서 {@code UnexpectedRollbackException}으로 함께
 * 롤백되는 문제가 있었다. 그래서 {@link #transactions}는 생성자에서 항상
 * {@code PROPAGATION_REQUIRES_NEW}로 강제해, outbox 항목마다 독립된 물리 트랜잭션에서 커밋/롤백이
 * 결정되도록 한다.</p>
 */
@Component
@ConditionalOnProperty(prefix = "sodam.integration.electronic-signature", name = "worker-enabled", havingValue = "true")
public class ElectronicSignatureWorker {
    private final ElectronicSignatureGateway gateway;
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final ElectronicSignatureOutboxRepository outboxRepository;
    private final ElectronicSignatureAttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final PrivateSignatureObjectStorage storage;
    private final SensitiveReferenceCrypto crypto;
    private final StoreManagerService storeManagerService;
    private final LaborContractService laborContractService;
    private final FixedScheduleService fixedScheduleService;
    private final EmploymentAmendmentService employmentAmendmentService;
    private final DelegatedActionAuthorityService delegatedActionAuthorityService;
    private final NotificationService notificationService;
    private final IntegrationProperties properties;
    private final TransactionTemplate transactions;
    private final ObjectMapper objectMapper;

    public ElectronicSignatureWorker(ElectronicSignatureGateway gateway,
                                      ElectronicSignatureEnvelopeRepository envelopeRepository,
                                      ElectronicSignaturePartyRepository partyRepository,
                                      ElectronicSignatureOutboxRepository outboxRepository,
                                      ElectronicSignatureAttemptRepository attemptRepository,
                                      UserRepository userRepository,
                                      PrivateSignatureObjectStorage storage,
                                      SensitiveReferenceCrypto crypto,
                                      StoreManagerService storeManagerService,
                                      LaborContractService laborContractService,
                                      FixedScheduleService fixedScheduleService,
                                      EmploymentAmendmentService employmentAmendmentService,
                                      DelegatedActionAuthorityService delegatedActionAuthorityService,
                                      NotificationService notificationService,
                                      IntegrationProperties properties,
                                      TransactionTemplate transactions,
                                      ObjectMapper objectMapper) {
        this.gateway = gateway;
        this.envelopeRepository = envelopeRepository;
        this.partyRepository = partyRepository;
        this.outboxRepository = outboxRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
        this.storage = storage;
        this.crypto = crypto;
        this.storeManagerService = storeManagerService;
        this.laborContractService = laborContractService;
        this.fixedScheduleService = fixedScheduleService;
        this.employmentAmendmentService = employmentAmendmentService;
        this.delegatedActionAuthorityService = delegatedActionAuthorityService;
        this.notificationService = notificationService;
        this.properties = properties;
        // 항목별 독립 롤백을 보장하기 위해 항상 새 물리 트랜잭션을 시작한다(클래스 Javadoc 참고).
        // 주입받은 템플릿을 직접 mutate하지 않고 복사본을 만든다 — 같은 TransactionTemplate 빈을
        // 공유하는 다른 서비스(ElectronicSignatureApplicationService 등)의 전파 옵션에 영향을 주면 안 된다.
        TransactionTemplate requiresNew = new TransactionTemplate(transactions.getTransactionManager(), transactions);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.transactions = requiresNew;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${sodam.integration.electronic-signature.worker-delay-ms:3000}")
    public void runDueWork() {
        List<Long> ids = outboxRepository.findDueIds(
                EnumSet.of(SignatureOutboxStatus.PENDING, SignatureOutboxStatus.RETRY),
                SignatureOutboxStatus.LEASED, LocalDateTime.now(), PageRequest.of(0, 20));
        for (Long id : ids) processOne(id);
    }

    void processOne(Long outboxId) {
        Work work = transactions.execute(status -> lease(outboxId));
        if (work == null) return;
        try {
            switch (work.operation()) {
                case REQUEST -> processRequest(work);
                case STATUS -> processStatus(work);
                case VERIFY -> processVerify(work);
                case FINALIZE -> finalizeEnvelope(work);
                case CANCEL -> completeOutbox(work.outboxId());
            }
        } catch (RuntimeException e) {
            transactions.executeWithoutResult(status -> handleFailure(work, e));
        }
    }

    private Work lease(Long outboxId) {
        ElectronicSignatureOutbox outbox = outboxRepository.findByIdForUpdate(outboxId).orElse(null);
        if (outbox == null || outbox.getStatus() == SignatureOutboxStatus.COMPLETED
                || outbox.getStatus() == SignatureOutboxStatus.CANCELLED
                || outbox.getStatus() == SignatureOutboxStatus.DEAD_LETTER) return null;
        outbox.lease(LocalDateTime.now().plusSeconds(30));
        return new Work(outbox.getId(), outbox.getEnvelopeId(), outbox.getPartyId(),
                outbox.getOperation(), outbox.getIdempotencyKey(), outbox.getAttemptCount());
    }

    private void processRequest(Work work) {
        RequestWork request = transactions.execute(status -> prepareRequest(work));
        if (request == null) return;
        ElectronicSignatureReceipt receipt = gateway.request(request.request());
        transactions.executeWithoutResult(status -> {
            ElectronicSignatureParty party = partyRepository.findByIdForUpdate(work.partyId())
                    .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
            if (party.getStatus() != SignaturePartyStatus.REQUEST_QUEUED) return;
            LocalDateTime now = LocalDateTime.now();
            party.markRequested(crypto.encrypt(receipt.receiptId()),
                    crypto.receiptHmac(party.getProvider(), receipt.receiptId()), now,
                    now.plusSeconds(request.request().expiresInSeconds()));
            finishAttempt(work.idempotencyKey(), ElectronicSignatureAttempt.ResultType.SUCCEEDED);
            completeAndQueueStatus(work, now.plusSeconds(2));
        });
    }

    private RequestWork prepareRequest(Work work) {
        if (attemptRepository.existsByIdempotencyKey(work.idempotencyKey())) {
            throw new IllegalStateException("이미 시작된 서명 요청은 자동 중복 호출하지 않습니다.");
        }
        ElectronicSignatureParty party = partyRepository.findById(work.partyId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
        ElectronicSignatureEnvelope envelope = party.getEnvelope();
        User user = requireSigner(party.getUserId());
        attemptRepository.save(ElectronicSignatureAttempt.started(
                party.getId(), SignatureOperation.REQUEST, work.idempotencyKey()));
        IntegrationProperties.ElectronicSignature c = properties.getElectronicSignature();
        String callCenter = c.getCallCenterNumber();
        if ((callCenter == null || callCenter.isBlank()) && c.resolvedMode() != IntegrationProperties.Mode.LIVE) {
            callCenter = "000-0000";
        }
        ElectronicSignatureRequest request = new ElectronicSignatureRequest(
                party.getProvider(), signer(user), DocumentDigest.fromHex(envelope.getDocumentSha256()),
                "소담 전자서명 요청", party.getProvider() == ElectronicSignatureProvider.TOSS ? null : "문서를 확인하고 서명해 주세요.",
                party.getProvider() == ElectronicSignatureProvider.NAVER ? callCenter : null,
                party.getProvider().policy().maxExpirySeconds(), false, null, null);
        return new RequestWork(request);
    }

    private void processStatus(Work work) {
        ElectronicSignatureParty snapshot = partyRepository.findById(work.partyId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
        if (snapshot.getStatus() != SignaturePartyStatus.PENDING) {
            completeOutbox(work.outboxId());
            return;
        }
        ElectronicSignatureStatus observed = gateway.getStatus(crypto.decrypt(snapshot.getReceiptRefEnc()));
        transactions.executeWithoutResult(status -> applyObservedStatus(work, observed));
    }

    private void applyObservedStatus(Work work, ElectronicSignatureStatus observed) {
        ElectronicSignatureParty party = partyRepository.findByIdForUpdate(work.partyId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
        if (party.getStatus() != SignaturePartyStatus.PENDING) {
            completeOutbox(work.outboxId());
            return;
        }
        switch (observed.status()) {
            case PENDING -> completeAndQueueStatus(work, LocalDateTime.now().plusSeconds(5));
            case COMPLETED -> {
                party.observeProviderCompleted(toLocal(observed.completedAt(), LocalDateTime.now()));
                party.queueVerification();
                completeOutbox(work.outboxId());
                queue(work.envelopeId(), party.getId(), SignatureOperation.VERIFY,
                        "verify:" + party.getId() + ":" + (party.getVerificationAttempts() + 1), LocalDateTime.now());
            }
            case EXPIRED -> terminate(work, party, SignaturePartyStatus.EXPIRED, SignatureEnvelopeStatus.EXPIRED);
            case DECLINED -> terminate(work, party, SignaturePartyStatus.DECLINED, SignatureEnvelopeStatus.DECLINED);
            case FAILED -> terminate(work, party, SignaturePartyStatus.FAILED, SignatureEnvelopeStatus.FAILED);
        }
    }

    private void processVerify(Work work) {
        VerifyWork verify = transactions.execute(status -> prepareVerify(work));
        if (verify == null) return;
        ElectronicSignatureVerification result = gateway.verify(verify.receiptId());
        if (result.status() != ProviderSignatureStatus.COMPLETED
                || !verify.expectedSigner().matches(result.signer())
                || result.signedData() == null || result.signedData().isBlank()) {
            throw new IllegalStateException("전자서명 검증 결과가 요청자 또는 문서와 일치하지 않습니다.");
        }
        byte[] signedData = result.signedData().getBytes(StandardCharsets.UTF_8);
        DocumentDigest digest = DocumentDigest.sha256(signedData);
        String objectRef = storage.put(PrivateSignatureObjectStorage.ObjectKind.SIGNED_DATA, work.envelopeId(),
                new ByteArrayInputStream(signedData), signedData.length, "application/octet-stream");
        String objectRefEnc = crypto.encrypt(objectRef);
        try {
            transactions.executeWithoutResult(status -> applyVerified(work, objectRefEnc, digest.hex()));
        } catch (RuntimeException e) {
            deleteObjectQuietly(objectRef);
            throw e;
        }
    }

    private VerifyWork prepareVerify(Work work) {
        ElectronicSignatureParty party = partyRepository.findByIdForUpdate(work.partyId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
        if (party.getStatus() != SignaturePartyStatus.VERIFY_QUEUED) {
            completeOutbox(work.outboxId());
            return null;
        }
        party.beginVerification();
        attemptRepository.save(ElectronicSignatureAttempt.started(
                party.getId(), SignatureOperation.VERIFY, work.idempotencyKey()));
        return new VerifyWork(crypto.decrypt(party.getReceiptRefEnc()), signer(requireSigner(party.getUserId())));
    }

    private void applyVerified(Work work, String objectRefEnc, String signedDataSha256) {
        ElectronicSignatureParty party = partyRepository.findByIdForUpdate(work.partyId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 party를 찾을 수 없습니다."));
        party.markVerified(objectRefEnc, signedDataSha256, LocalDateTime.now());
        finishAttempt(work.idempotencyKey(), ElectronicSignatureAttempt.ResultType.SUCCEEDED);
        completeOutbox(work.outboxId());
        ElectronicSignatureEnvelope envelope = envelopeRepository.findByIdForUpdate(work.envelopeId())
                .orElseThrow(() -> new EntityNotFoundException("전자서명 envelope를 찾을 수 없습니다."));
        List<ElectronicSignatureParty> parties = partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelope.getId());
        ElectronicSignatureParty next = parties.stream()
                .filter(p -> p.getSigningOrder() > party.getSigningOrder())
                .findFirst().orElse(null);
        if (next != null) {
            envelope.advanceTo(next.getSigningOrder());
            next.queueRequest();
            queue(envelope.getId(), next.getId(), SignatureOperation.REQUEST,
                    "request:" + next.getId(), LocalDateTime.now());
            notificationService.push(next.getUserId(), com.rich.sodam.config.integration.PushNotifier.PushMessage.builder()
                    .title("전자서명 차례가 왔어요")
                    .body("문서와 서명 역할을 확인한 뒤 전자서명을 진행해 주세요.")
                    .deepLink("sodam://e-sign/" + envelope.getId())
                    .data(java.util.Map.of("type", "ELECTRONIC_SIGNATURE_READY"))
                    .build());
            return;
        }
        if (parties.stream().anyMatch(p -> p.getStatus() != SignaturePartyStatus.VERIFIED)) {
            throw new IllegalStateException("전자서명 완료 순서가 일치하지 않습니다.");
        }
        queue(envelope.getId(), null, SignatureOperation.FINALIZE,
                "finalize:" + envelope.getId(), LocalDateTime.now());
    }

    private void finalizeEnvelope(Work work) {
        Long envelopeId = work.envelopeId();
        ElectronicSignatureEnvelope snapshot = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 envelope를 찾을 수 없습니다."));
        if (snapshot.getStatus().terminal()) {
            transactions.executeWithoutResult(status -> completeOutbox(work.outboxId()));
            return;
        }
        List<ElectronicSignatureParty> parties = partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId);
        if (parties.stream().anyMatch(p -> p.getStatus() != SignaturePartyStatus.VERIFIED)) {
            throw new IllegalStateException("모든 서명자가 검증되기 전에는 문서를 확정할 수 없습니다.");
        }
        byte[] manifest;
        try {
            java.util.Map<String, Object> manifestValues = new java.util.LinkedHashMap<>();
            manifestValues.put("envelopeId", envelopeId);
            manifestValues.put("documentSha256", snapshot.getDocumentSha256());
            manifestValues.put("documentVersion", snapshot.getDocumentVersion());
            if (snapshot.getAuthorityEnvelopeId() != null) {
                manifestValues.put("signingActorUserId", snapshot.getSigningActorUserId());
                manifestValues.put("delegatedByMasterId", snapshot.getDelegatedByMasterId());
                manifestValues.put("authorityEnvelopeId", snapshot.getAuthorityEnvelopeId());
                manifestValues.put("authorityVersion", snapshot.getAuthorityVersion());
            }
            manifestValues.put("parties", parties.stream().map(p -> java.util.Map.of(
                            "role", p.getSignerRole().name(),
                            "order", p.getSigningOrder(),
                            "signedDataSha256", p.getSignedDataSha256(),
                            "verifiedAt", p.getVerifiedAt().toString())).toList());
            manifest = objectMapper.writeValueAsBytes(manifestValues);
        } catch (Exception e) {
            throw new IllegalStateException("전자서명 완료 manifest 생성에 실패했습니다.", e);
        }
        String ref = storage.put(PrivateSignatureObjectStorage.ObjectKind.COMPLETION_MANIFEST, envelopeId,
                new ByteArrayInputStream(manifest), manifest.length, "application/json");
        String refEnc = crypto.encrypt(ref);
        String manifestSha256 = DocumentDigest.sha256(manifest).hex();
        boolean bound;
        try {
            bound = Boolean.TRUE.equals(transactions.execute(status -> {
                ElectronicSignatureEnvelope envelope = envelopeRepository.findByIdForUpdate(envelopeId)
                        .orElseThrow(() -> new EntityNotFoundException("전자서명 envelope를 찾을 수 없습니다."));
                if (envelope.getStatus().terminal()) {
                    completeOutbox(work.outboxId());
                    return false;
                }
                if (partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId).stream()
                        .anyMatch(p -> p.getStatus() != SignaturePartyStatus.VERIFIED)) {
                    throw new IllegalStateException("모든 서명자가 검증되기 전에는 문서를 확정할 수 없습니다.");
                }
                if (envelope.getSubjectType() == SignatureSubjectType.LABOR_CONTRACT) {
                    delegatedActionAuthorityService.revalidateContractEnvelope(envelope);
                }
                envelope.complete(refEnc, manifestSha256, LocalDateTime.now());
                if (envelope.getSubjectType() == SignatureSubjectType.MANAGER_DELEGATION) {
                    storeManagerService.activateSignedDelegationByRelationId(
                            envelope.getStoreId(), envelope.getSubjectId(), envelope.getId(),
                            envelope.getDocumentVersion(), envelope.getDocumentSha256());
                } else if (envelope.getSubjectType() == SignatureSubjectType.LABOR_CONTRACT) {
                    LaborContract contract = laborContractService.activateVerifiedElectronicSignature(
                            envelope.getSubjectId(), envelope.getId(), envelope.getDocumentVersion(),
                            LocalDateTime.now(), envelope.getCreatedByUserId());
                    fixedScheduleService.activateFromContract(contract);
                } else if (envelope.getSubjectType() == SignatureSubjectType.LABOR_CONTRACT_AMENDMENT) {
                    employmentAmendmentService.markVerified(
                            envelope.getSubjectId(), envelope.getId(), envelope.getDocumentVersion(), LocalDateTime.now());
                }
                partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId).stream()
                        .map(ElectronicSignatureParty::getUserId)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .forEach(userId -> notificationService.push(userId,
                                com.rich.sodam.config.integration.PushNotifier.PushMessage.builder()
                                        .title("전자서명이 완료됐어요")
                                        .body("모든 서명이 검증되어 문서가 확정됐습니다.")
                                        .deepLink("sodam://e-sign/" + envelopeId)
                                        .data(java.util.Map.of("type", "ELECTRONIC_SIGNATURE_VERIFIED"))
                                        .build()));
                completeOutbox(work.outboxId());
                return true;
            }));
        } catch (RuntimeException e) {
            deleteObjectQuietly(ref);
            throw e;
        }
        if (!bound) deleteObjectQuietly(ref);
    }

    private void handleFailure(Work work, RuntimeException error) {
        ElectronicSignatureOutbox outbox = outboxRepository.findByIdForUpdate(work.outboxId()).orElse(null);
        if (outbox == null || outbox.getStatus() != SignatureOutboxStatus.LEASED) return;
        String errorClass = error.getClass().getSimpleName();
        ElectronicSignatureParty party = work.partyId() == null ? null
                : partyRepository.findByIdForUpdate(work.partyId()).orElse(null);
        if (work.operation() == SignatureOperation.STATUS && work.attempt() < 8) {
            outbox.retry(LocalDateTime.now().plusSeconds(Math.min(60, 1L << Math.min(work.attempt(), 5))), errorClass);
            return;
        }
        if (work.operation() == SignatureOperation.FINALIZE && work.attempt() < 5) {
            outbox.retry(LocalDateTime.now().plusSeconds(Math.min(60, 1L << Math.min(work.attempt(), 5))), errorClass);
            return;
        }
        if (work.operation() == SignatureOperation.VERIFY && party != null
                && party.getProvider() == ElectronicSignatureProvider.TOSS
                && party.getVerificationAttempts() < party.getProvider().policy().maxVerificationAttempts()) {
            party.retryVerification();
            outbox.deadLetter(errorClass);
            queue(work.envelopeId(), party.getId(), SignatureOperation.VERIFY,
                    "verify:" + party.getId() + ":" + (party.getVerificationAttempts() + 1),
                    LocalDateTime.now().plusSeconds(2));
            return;
        }
        outbox.deadLetter(errorClass);
        if (party != null && !party.getStatus().terminal()) {
            party.terminate(SignaturePartyStatus.MANUAL_REISSUE_REQUIRED);
        }
        envelopeRepository.findByIdForUpdate(work.envelopeId()).ifPresent(e -> {
            if (!e.getStatus().terminal()) e.fail(SignatureEnvelopeStatus.MANUAL_REISSUE_REQUIRED);
        });
    }

    private void terminate(Work work, ElectronicSignatureParty party, SignaturePartyStatus partyStatus,
                           SignatureEnvelopeStatus envelopeStatus) {
        party.terminate(partyStatus);
        envelopeRepository.findByIdForUpdate(work.envelopeId()).ifPresent(e -> e.fail(envelopeStatus));
        completeOutbox(work.outboxId());
    }

    private void completeAndQueueStatus(Work work, LocalDateTime next) {
        completeOutbox(work.outboxId());
        queue(work.envelopeId(), work.partyId(), SignatureOperation.STATUS,
                "status:" + work.partyId() + ":" + java.util.UUID.randomUUID(), next);
    }

    private void queue(Long envelopeId, Long partyId, SignatureOperation operation, String key, LocalDateTime due) {
        if (!outboxRepository.existsByIdempotencyKey(key)) {
            outboxRepository.save(ElectronicSignatureOutbox.queue(envelopeId, partyId, operation, key, due));
        }
    }

    private void completeOutbox(Long id) {
        ElectronicSignatureOutbox outbox = outboxRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 outbox를 찾을 수 없습니다."));
        if (outbox.getStatus() == SignatureOutboxStatus.LEASED) outbox.complete();
    }

    private void finishAttempt(String key, ElectronicSignatureAttempt.ResultType result) {
        attemptRepository.findByIdempotencyKey(key).ifPresent(a -> a.finish(result, null));
    }

    private void deleteObjectQuietly(String objectRef) {
        try {
            storage.delete(objectRef);
        } catch (RuntimeException ignored) {
            // 민감한 object ref를 로그에 남기지 않는다. 저장소 수명주기 정책이 최종 안전망이다.
        }
    }

    private User requireSigner(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 사용자를 찾을 수 없습니다."));
        if (user.getPhone() == null || user.getBirthDate() == null) {
            throw new IllegalStateException("전자서명 전에 휴대전화와 생년월일 프로필을 완성해야 합니다.");
        }
        return user;
    }

    private SignerIdentity signer(User user) {
        return new SignerIdentity(user.getName(), user.getPhone(), user.getBirthDate().toString().replace("-", ""));
    }

    private LocalDateTime toLocal(java.time.Instant instant, LocalDateTime fallback) {
        return instant == null ? fallback : LocalDateTime.ofInstant(instant, java.time.ZoneOffset.UTC);
    }

    private record Work(Long outboxId, Long envelopeId, Long partyId, SignatureOperation operation,
                        String idempotencyKey, int attempt) {}
    private record RequestWork(ElectronicSignatureRequest request) {}
    private record VerifyWork(String receiptId, SignerIdentity expectedSigner) {}
}
