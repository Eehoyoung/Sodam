package com.rich.sodam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.config.integration.electronicsignature.LocalPrivateSignatureObjectStorage;
import com.rich.sodam.config.integration.electronicsignature.MockElectronicSignatureGateway;
import com.rich.sodam.core.electronicsignature.*;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.*;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class ElectronicSignatureWorkerPersistenceTest {
    @Autowired ElectronicSignatureEnvelopeRepository envelopeRepository;
    @Autowired ElectronicSignaturePartyRepository partyRepository;
    @Autowired ElectronicSignatureOutboxRepository outboxRepository;
    @Autowired ElectronicSignatureAttemptRepository attemptRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    // WP-07 B-4: transactions 필드가 PROPAGATION_REQUIRES_NEW로 바뀌면서, @DataJpaTest가 테스트
    // 메서드 전체에 걸어두는 암묵적 @Transactional(미커밋) 안에서는 REQUIRES_NEW 구간이 별도
    // 물리 커넥션/EntityManager로 격리돼 이 테스트의 setUp 데이터(아직 커밋 전)를 보지 못한다.
    // finalizationFailureDeletesUnboundManifestAndRetriesFinalizeOutbox()와 동일하게 클래스
    // 레벨 트랜잭션 참여를 끊어, 모든 repository 호출이 실제로 커밋되도록 한다.
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void requestStatusVerifyStoresRawEvidenceOnlyInPrivateObjectStorage() throws Exception {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getElectronicSignature().setMode("mock");
        properties.getElectronicSignature().setProvider("naver");
        properties.getElectronicSignature().setAllowedReturnScheme("sodam");
        SensitiveReferenceCrypto crypto = new SensitiveReferenceCrypto(toKeySource(properties));
        LocalPrivateSignatureObjectStorage storage = new LocalPrivateSignatureObjectStorage();

        User signer = new User("signer@example.test", "홍길동");
        signer.setUserGrade(UserGrade.EMPLOYEE);
        signer.setPhone("01012345678");
        signer.setBirthDate(LocalDate.of(1990, 1, 2));
        signer = userRepository.saveAndFlush(signer);

        byte[] pdf = "%PDF-fixed".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String pdfRef = storage.put(PrivateSignatureObjectStorage.ObjectKind.UNSIGNED_PDF, 100L,
                new ByteArrayInputStream(pdf), pdf.length, "application/pdf");
        ElectronicSignatureEnvelope envelope = envelopeRepository.saveAndFlush(ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 100L, 200L, 1,
                DocumentDigest.sha256(pdf).hex(), crypto.encrypt(pdfRef), signer.getId()));
        envelope.markInProgress();
        // WP-07 B-4: 이 테스트는 이제 @Transactional(propagation = NOT_SUPPORTED)라 saveAndFlush()가
        // 반환하는 엔티티가 곧바로 detach된다 — 위 markInProgress() mutation을 다시 저장해야 DB에 반영된다.
        envelope = envelopeRepository.saveAndFlush(envelope);
        ElectronicSignatureParty party = partyRepository.saveAndFlush(ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, signer.getId(), 1, ElectronicSignatureProvider.NAVER));
        party.queueRequest();
        party = partyRepository.saveAndFlush(party);
        ElectronicSignatureOutbox request = outboxRepository.saveAndFlush(ElectronicSignatureOutbox.queue(
                envelope.getId(), party.getId(), SignatureOperation.REQUEST,
                "request:" + party.getId(), LocalDateTime.now()));

        LaborContractService laborContractService = mock(LaborContractService.class);
        FixedScheduleService fixedScheduleService = mock(FixedScheduleService.class);
        LaborContract finalizedContract = mock(LaborContract.class);
        when(laborContractService.activateVerifiedElectronicSignature(
                anyLong(), anyLong(), anyInt(), any(LocalDateTime.class), anyLong()))
                .thenReturn(finalizedContract);
        DelegatedActionAuthorityService authorityService = mock(DelegatedActionAuthorityService.class);
        ElectronicSignatureWorker worker = new ElectronicSignatureWorker(
                new MockElectronicSignatureGateway(properties), envelopeRepository, partyRepository,
                outboxRepository, attemptRepository, userRepository, storage, crypto,
                mock(StoreManagerService.class), laborContractService, fixedScheduleService,
                mock(EmploymentAmendmentService.class),
                authorityService,
                mock(NotificationService.class), properties,
                new TransactionTemplate(transactionManager), new ObjectMapper().findAndRegisterModules());

        worker.processOne(request.getId());
        worker.processOne(pending(envelope.getId(), SignatureOperation.STATUS).getId());
        worker.processOne(pending(envelope.getId(), SignatureOperation.VERIFY).getId());
        worker.processOne(pending(envelope.getId(), SignatureOperation.FINALIZE).getId());

        ElectronicSignatureParty verified = partyRepository.findById(party.getId()).orElseThrow();
        ElectronicSignatureEnvelope completed = envelopeRepository.findById(envelope.getId()).orElseThrow();
        assertThat(verified.getStatus()).isEqualTo(SignaturePartyStatus.VERIFIED);
        assertThat(verified.getSignedDataObjectRefEnc()).startsWith("v1.k1.");
        assertThat(verified.getSignedDataSha256()).hasSize(64);
        assertThat(completed.getStatus()).isEqualTo(SignatureEnvelopeStatus.VERIFIED);
        String evidenceRef = crypto.decrypt(verified.getSignedDataObjectRefEnc());
        assertThat(storage.open(evidenceRef).readAllBytes()).isNotEmpty();
        verify(laborContractService).activateVerifiedElectronicSignature(
                eq(100L), eq(envelope.getId()), eq(1), any(LocalDateTime.class), eq(signer.getId()));
        verify(fixedScheduleService).activateFromContract(finalizedContract);
        verify(authorityService).revalidateContractEnvelope(any(ElectronicSignatureEnvelope.class));

        storage.delete(evidenceRef);
        storage.delete(crypto.decrypt(completed.getCompletionManifestRefEnc()));
        storage.delete(pdfRef);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void finalizationFailureDeletesUnboundManifestAndRetriesFinalizeOutbox() {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getElectronicSignature().setMode("mock");
        properties.getElectronicSignature().setProvider("naver");
        properties.getElectronicSignature().setAllowedReturnScheme("sodam");
        SensitiveReferenceCrypto crypto = new SensitiveReferenceCrypto(toKeySource(properties));
        PrivateSignatureObjectStorage storage = mock(PrivateSignatureObjectStorage.class);
        when(storage.put(any(), anyLong(), any(), anyLong(), anyString())).thenAnswer(invocation -> {
            PrivateSignatureObjectStorage.ObjectKind kind = invocation.getArgument(0);
            return kind == PrivateSignatureObjectStorage.ObjectKind.SIGNED_DATA
                    ? "signed-data/test-object" : "manifest/test-object";
        });

        User signer = new User("finalize@example.test", "홍길동");
        signer.setUserGrade(UserGrade.EMPLOYEE);
        signer.setPhone("01012345678");
        signer.setBirthDate(LocalDate.of(1990, 1, 2));
        signer = userRepository.saveAndFlush(signer);

        byte[] pdf = "%PDF-fixed".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 101L, 201L, 1,
                DocumentDigest.sha256(pdf).hex(), crypto.encrypt("unsigned/test-object"), signer.getId());
        envelope.markInProgress();
        envelope = envelopeRepository.saveAndFlush(envelope);
        ElectronicSignatureParty party = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, signer.getId(), 1, ElectronicSignatureProvider.NAVER);
        party.queueRequest();
        party = partyRepository.saveAndFlush(party);
        ElectronicSignatureOutbox request = outboxRepository.saveAndFlush(ElectronicSignatureOutbox.queue(
                envelope.getId(), party.getId(), SignatureOperation.REQUEST,
                "request:" + party.getId(), LocalDateTime.now()));

        LaborContractService laborContractService = mock(LaborContractService.class);
        DelegatedActionAuthorityService authorityService = mock(DelegatedActionAuthorityService.class);
        doThrow(new org.springframework.security.access.AccessDeniedException("revoked delegation"))
                .when(authorityService).revalidateContractEnvelope(any(ElectronicSignatureEnvelope.class));
        ElectronicSignatureWorker worker = new ElectronicSignatureWorker(
                new MockElectronicSignatureGateway(properties), envelopeRepository, partyRepository,
                outboxRepository, attemptRepository, userRepository, storage, crypto,
                mock(StoreManagerService.class), laborContractService, mock(FixedScheduleService.class),
                mock(EmploymentAmendmentService.class), authorityService,
                mock(NotificationService.class), properties,
                new TransactionTemplate(transactionManager), new ObjectMapper().findAndRegisterModules());

        worker.processOne(request.getId());
        worker.processOne(pending(envelope.getId(), SignatureOperation.STATUS).getId());
        worker.processOne(pending(envelope.getId(), SignatureOperation.VERIFY).getId());
        ElectronicSignatureOutbox finalizeOutbox = pending(envelope.getId(), SignatureOperation.FINALIZE);
        worker.processOne(finalizeOutbox.getId());

        ElectronicSignatureOutbox retried = outboxRepository.findById(finalizeOutbox.getId()).orElseThrow();
        assertThat(retried.getStatus()).isEqualTo(SignatureOutboxStatus.RETRY);
        assertThat(envelopeRepository.findById(envelope.getId()).orElseThrow().getStatus())
                .isEqualTo(SignatureEnvelopeStatus.IN_PROGRESS);
        assertThat(partyRepository.findById(party.getId()).orElseThrow().getStatus())
                .isEqualTo(SignaturePartyStatus.VERIFIED);
        verify(storage).delete("manifest/test-object");
        verify(storage, never()).delete("signed-data/test-object");
        verifyNoInteractions(laborContractService);
    }

    private static SensitiveReferenceKeySource toKeySource(IntegrationProperties properties) {
        IntegrationProperties.ElectronicSignature c = properties.getElectronicSignature();
        return new SensitiveReferenceKeySource() {
            public String refEncryptionKey() { return c.getRefEncryptionKey(); }
            public String refHmacPepper() { return c.getRefHmacPepper(); }
            public boolean live() { return c.resolvedMode() == IntegrationProperties.Mode.LIVE; }
        };
    }

    private ElectronicSignatureOutbox pending(Long envelopeId, SignatureOperation operation) {
        return outboxRepository.findByEnvelopeId(envelopeId).stream()
                .filter(o -> o.getOperation() == operation)
                .filter(o -> o.getStatus() == SignatureOutboxStatus.PENDING
                        || o.getStatus() == SignatureOutboxStatus.RETRY)
                .findFirst().orElseThrow();
    }
}
