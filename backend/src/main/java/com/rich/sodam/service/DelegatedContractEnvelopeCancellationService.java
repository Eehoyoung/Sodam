package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureOutbox;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignaturePartyStatus;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.ElectronicSignatureOutboxRepository;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 대리 계약 권한이 사라질 때, 그 위임 증적에 묶인 미완료 근로계약 전자서명 흐름을 로컬에서 즉시 중단한다.
 * 이미 공급자에게 전달된 서명 요청은 제공자 취소 API가 제공될 때까지 외부 화면에 남을 수 있으나,
 * 이 애플리케이션은 이후 상태 반영·문서 확정·계약 효력 발생을 허용하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class DelegatedContractEnvelopeCancellationService {

    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final ElectronicSignatureOutboxRepository outboxRepository;

    public void cancelUnfinishedContracts(Long managerUserId, Long authorityEnvelopeId) {
        if (managerUserId == null || authorityEnvelopeId == null) {
            return;
        }

        for (ElectronicSignatureEnvelope envelope : envelopeRepository.findByAuthorityEnvelopeId(authorityEnvelopeId)) {
            if (envelope.getSubjectType() != SignatureSubjectType.LABOR_CONTRACT
                    || !managerUserId.equals(envelope.getSigningActorUserId())
                    || envelope.getStatus().terminal()) {
                continue;
            }

            envelope.fail(SignatureEnvelopeStatus.CANCELLED);
            for (ElectronicSignatureParty party : partyRepository
                    .findByEnvelope_IdOrderBySigningOrderAsc(envelope.getId())) {
                if (!party.getStatus().terminal()) {
                    party.terminate(SignaturePartyStatus.CANCELLED);
                }
            }
            for (ElectronicSignatureOutbox outbox : outboxRepository.findByEnvelopeId(envelope.getId())) {
                outbox.cancel();
            }
        }
    }
}
