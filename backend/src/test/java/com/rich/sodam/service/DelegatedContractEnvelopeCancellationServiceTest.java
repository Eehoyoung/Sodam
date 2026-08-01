package com.rich.sodam.service;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureOutbox;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignatureOutboxStatus;
import com.rich.sodam.domain.type.SignaturePartyStatus;
import com.rich.sodam.domain.type.SignatureSignerRole;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.domain.type.SignatureOperation;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.ElectronicSignatureOutboxRepository;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

class DelegatedContractEnvelopeCancellationServiceTest {

    @Test
    void permissionLossCancelsEnvelopePartiesAndOutstandingOutboxWork() {
        ElectronicSignatureEnvelopeRepository envelopes = mock(ElectronicSignatureEnvelopeRepository.class);
        ElectronicSignaturePartyRepository parties = mock(ElectronicSignaturePartyRepository.class);
        ElectronicSignatureOutboxRepository outboxes = mock(ElectronicSignatureOutboxRepository.class);
        DelegatedContractEnvelopeCancellationService service =
                new DelegatedContractEnvelopeCancellationService(envelopes, parties, outboxes);

        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 100L, 10L, 1,
                "a".repeat(64), "v1.k1.unsigned", 20L);
        setField(envelope, "id", 500L);
        envelope.bindDelegatedAuthority(20L, 1L, 91L, 3);
        envelope.markInProgress();
        ElectronicSignatureParty party = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.MANAGER, 20L, 1, ElectronicSignatureProvider.TOSS);
        party.queueRequest();
        ElectronicSignatureOutbox outbox = ElectronicSignatureOutbox.queue(
                500L, 1L, SignatureOperation.REQUEST, "request:1", LocalDateTime.now());

        when(envelopes.findByAuthorityEnvelopeId(91L)).thenReturn(List.of(envelope));
        when(parties.findByEnvelope_IdOrderBySigningOrderAsc(500L)).thenReturn(List.of(party));
        when(outboxes.findByEnvelopeId(500L)).thenReturn(List.of(outbox));

        service.cancelUnfinishedContracts(20L, 91L);

        assertThat(envelope.getStatus()).isEqualTo(SignatureEnvelopeStatus.CANCELLED);
        assertThat(party.getStatus()).isEqualTo(SignaturePartyStatus.CANCELLED);
        assertThat(outbox.getStatus()).isEqualTo(SignatureOutboxStatus.CANCELLED);
    }
}
