package com.rich.sodam.service;

import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import com.rich.sodam.core.electronicsignature.SensitiveReferenceCrypto;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.type.SignatureSubjectType;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ElectronicSignatureEvidencePurgeService {
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final PrivateSignatureObjectStorage storage;
    private final SensitiveReferenceCrypto crypto;

    @Transactional
    public void purge(Long envelopeId, SignatureSubjectType expectedSubject) {
        ElectronicSignatureEnvelope envelope = envelopeRepository.findByIdForUpdate(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 봉투를 찾을 수 없습니다."));
        if (envelope.getSubjectType() != expectedSubject) {
            throw new IllegalStateException("보존정책과 전자서명 문서 유형이 일치하지 않습니다.");
        }
        deleteEncryptedRef(envelope.getUnsignedObjectRefEnc());
        deleteEncryptedRef(envelope.getCompletionManifestRefEnc());
        for (ElectronicSignatureParty party : partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId)) {
            deleteEncryptedRef(party.getSignedDataObjectRefEnc());
            party.purgeSensitiveReferences();
        }
        envelope.purgeEvidenceObjectReferences();
    }

    private void deleteEncryptedRef(String encryptedRef) {
        if (encryptedRef != null) storage.delete(crypto.decrypt(encryptedRef));
    }
}
