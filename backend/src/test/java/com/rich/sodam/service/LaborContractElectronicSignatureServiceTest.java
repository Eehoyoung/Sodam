package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

class LaborContractElectronicSignatureServiceTest {

    @Test
    void cancelledEnvelopeIsReissuedWithTheNextDocumentVersion() {
        LaborContractRepository contracts = mock(LaborContractRepository.class);
        ElectronicSignatureEnvelopeRepository envelopes = mock(ElectronicSignatureEnvelopeRepository.class);
        LaborContractService laborContracts = mock(LaborContractService.class);
        ElectronicSignatureApplicationService signatures = mock(ElectronicSignatureApplicationService.class);
        EmployeeDocumentService documents = mock(EmployeeDocumentService.class);
        DelegatedActionAuthorityService authorityService = mock(DelegatedActionAuthorityService.class);
        LaborContractElectronicSignatureService service = new LaborContractElectronicSignatureService(
                contracts, envelopes, laborContracts, signatures, documents, authorityService,
                mock(StoreDelegationAuditRepository.class));

        LaborContract contract = new LaborContract();
        contract.setStoreId(10L);
        contract.setEmployeeId(30L);
        contract.linkElectronicSignature(100L, 1, LocalDateTime.now());
        ElectronicSignatureEnvelope cancelled = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 300L, 10L, 1,
                "a".repeat(64), "v1.k1.previous", 1L);
        setField(cancelled, "id", 100L);
        cancelled.fail(SignatureEnvelopeStatus.CANCELLED);
        ElectronicSignatureEnvelope replacement = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.LABOR_CONTRACT, 300L, 10L, 2,
                "b".repeat(64), "v1.k1.replacement", 1L);
        setField(replacement, "id", 200L);

        DelegatedActionAuthorityService.Authority owner = new DelegatedActionAuthorityService.Authority(
                1L, 1L, true, null, 0, EnumSet.noneOf(com.rich.sodam.domain.type.ManagerPermission.class));
        when(authorityService.requireContract(1L, 10L)).thenReturn(owner);
        when(contracts.findByIdForUpdate(300L)).thenReturn(Optional.of(contract));
        when(envelopes.findById(100L)).thenReturn(Optional.of(cancelled));
        when(laborContracts.generateContractPdf(300L)).thenReturn("%PDF".getBytes());
        when(signatures.createLaborContract(any(), eq(300L), eq(10L), eq(30L), eq(2), any()))
                .thenReturn(replacement);

        ElectronicSignatureEnvelope sent = service.send(1L, 10L, 300L);

        assertThat(sent.getId()).isEqualTo(200L);
        assertThat(contract.getElectronicSignatureEnvelopeId()).isEqualTo(200L);
        assertThat(contract.getElectronicSignatureDocumentVersion()).isEqualTo(2);
        verify(signatures).createLaborContract(any(), eq(300L), eq(10L), eq(30L), eq(2), any());
    }
}
