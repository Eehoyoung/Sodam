package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import com.rich.sodam.core.electronicsignature.SensitiveReferenceCrypto;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.type.SignatureSignerRole;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.ElectronicSignatureOutboxRepository;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

class ElectronicSignatureApplicationServiceAccessTest {

    @Test
    void revokedDelegatedManagerCannotReadEnvelopeStatusAsHistoricalParty() {
        ElectronicSignatureEnvelopeRepository envelopes = mock(ElectronicSignatureEnvelopeRepository.class);
        ElectronicSignaturePartyRepository parties = mock(ElectronicSignaturePartyRepository.class);
        DelegatedActionAuthorityService authority = mock(DelegatedActionAuthorityService.class);
        ElectronicSignatureApplicationService service = new ElectronicSignatureApplicationService(
                envelopes, parties, mock(ElectronicSignatureOutboxRepository.class),
                mock(PrivateSignatureObjectStorage.class), mock(SensitiveReferenceCrypto.class),
                mock(IntegrationProperties.class), mock(StoreAccessGuard.class), mock(TransactionTemplate.class),
                mock(ElectronicSignatureCertificateService.class), mock(ElectronicSignatureAccessAuditService.class),
                authority);

        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 100L, 10L, 1,
                "a".repeat(64), "v1.k1.unsigned", 20L);
        setField(envelope, "id", 500L);
        envelope.bindDelegatedAuthority(20L, 1L, 91L, 3);
        ElectronicSignatureParty manager = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.MANAGER, 20L, 1,
                com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider.TOSS);
        when(envelopes.findById(500L)).thenReturn(Optional.of(envelope));
        when(parties.findByEnvelope_IdOrderBySigningOrderAsc(500L)).thenReturn(List.of(manager));
        doThrow(new AccessDeniedException("revoked"))
                .when(authority).assertActiveDelegatedContractSigner(20L, envelope);

        assertThatThrownBy(() -> service.getAuthorized(20L, 500L))
                .isInstanceOf(AccessDeniedException.class);

        verify(authority).assertActiveDelegatedContractSigner(20L, envelope);
    }
}
