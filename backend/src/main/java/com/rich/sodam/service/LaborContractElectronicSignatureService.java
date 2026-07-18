package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.LaborContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 근로계약 고정 PDF, 순차 서명 봉투, 직원 문서함 연결을 한 흐름으로 묶는다. */
@Service
@RequiredArgsConstructor
public class LaborContractElectronicSignatureService {
    private static final int DOCUMENT_VERSION = 1;

    private final LaborContractRepository laborContractRepository;
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final LaborContractService laborContractService;
    private final ElectronicSignatureApplicationService electronicSignatureService;
    private final EmployeeDocumentService employeeDocumentService;
    private final DelegatedActionAuthorityService authorityService;
    private final com.rich.sodam.repository.StoreDelegationAuditRepository delegationAuditRepository;

    @Transactional
    public ElectronicSignatureEnvelope send(Long actorUserId, Long storeId, Long contractId) {
        DelegatedActionAuthorityService.Authority authority =
                authorityService.requireContract(actorUserId, storeId);
        LaborContract contract = laborContractRepository.findByIdForUpdate(contractId)
                .orElseThrow(() -> new EntityNotFoundException("근로계약서를 찾을 수 없습니다."));
        if (!storeId.equals(contract.getStoreId())) {
            throw new org.springframework.security.access.AccessDeniedException("해당 매장의 근로계약서가 아닙니다.");
        }
        if (contract.getElectronicSignatureEnvelopeId() != null) {
            return envelopeRepository.findById(contract.getElectronicSignatureEnvelopeId())
                    .orElseThrow(() -> new EntityNotFoundException("연결된 전자서명 봉투를 찾을 수 없습니다."));
        }

        contract.bindSigningAuthority(authority.actorUserId(), authority.ownerUserId(),
                authority.delegationEnvelopeId(), authority.delegationVersion());
        byte[] pdf = laborContractService.generateContractPdf(contractId);
        ElectronicSignatureEnvelope envelope = electronicSignatureService.createLaborContract(
                authority, contractId, storeId, contract.getEmployeeId(), DOCUMENT_VERSION, pdf);
        if (!authority.owner()) {
            delegationAuditRepository.save(com.rich.sodam.domain.StoreDelegationAudit.of(
                    storeId, contract.getEmployeeId(), authority.ownerUserId(), authority.actorUserId(),
                    com.rich.sodam.domain.StoreDelegationAudit.ActorType.MANAGER,
                    com.rich.sodam.domain.StoreDelegationAudit.Action.CONTRACT_DELEGATION_USED,
                    authority.permissions(), authority.delegationVersion(), envelope.getId(),
                    envelope.getDocumentSha256(), "authorityEnvelope=" + authority.delegationEnvelopeId()));
        }
        contract.linkElectronicSignature(envelope.getId(), DOCUMENT_VERSION, LocalDateTime.now());
        employeeDocumentService.linkLaborContract(
                storeId, contract.getEmployeeId(), contractId,
                contract.getStartDate() == null ? LocalDate.now() : contract.getStartDate());
        return envelope;
    }
}
