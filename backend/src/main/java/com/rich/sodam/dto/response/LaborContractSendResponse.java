package com.rich.sodam.dto.response;

import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.type.SignatureEnvelopeStatus;

public record LaborContractSendResponse(Long envelopeId, SignatureEnvelopeStatus status) {
    public static LaborContractSendResponse from(ElectronicSignatureEnvelope envelope) {
        return new LaborContractSendResponse(envelope.getId(), envelope.getStatus());
    }
}
