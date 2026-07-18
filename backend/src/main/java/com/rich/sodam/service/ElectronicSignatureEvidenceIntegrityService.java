package com.rich.sodam.service;

import com.rich.sodam.core.electronicsignature.DocumentDigest;
import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import com.rich.sodam.core.electronicsignature.SensitiveReferenceCrypto;
import com.rich.sodam.domain.ElectronicSignatureEnvelope;
import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.ElectronicSignatureEnvelopeRepository;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ElectronicSignatureEvidenceIntegrityService {
    private final ElectronicSignatureEnvelopeRepository envelopeRepository;
    private final ElectronicSignaturePartyRepository partyRepository;
    private final PrivateSignatureObjectStorage storage;
    private final SensitiveReferenceCrypto crypto;
    private final ElectronicSignatureApplicationService authorizationService;

    @Transactional(readOnly = true)
    public IntegrityReport reconcile(Long userId, Long envelopeId) {
        authorizationService.getAuthorized(userId, envelopeId);
        ElectronicSignatureEnvelope envelope = envelopeRepository.findById(envelopeId)
                .orElseThrow(() -> new EntityNotFoundException("전자서명 봉투를 찾을 수 없습니다."));
        List<String> mismatches = new ArrayList<>();
        compare(envelope.getUnsignedObjectRefEnc(), envelope.getDocumentSha256(), "DOCUMENT", mismatches);
        compare(envelope.getCompletionManifestRefEnc(), envelope.getCompletionManifestSha256(),
                "COMPLETION_MANIFEST", mismatches);
        for (ElectronicSignatureParty party : partyRepository.findByEnvelope_IdOrderBySigningOrderAsc(envelopeId)) {
            compare(party.getSignedDataObjectRefEnc(), party.getSignedDataSha256(),
                    "SIGNED_DATA_ORDER_" + party.getSigningOrder(), mismatches);
        }
        return new IntegrityReport(envelopeId, mismatches.isEmpty(), List.copyOf(mismatches));
    }

    private void compare(String encryptedRef, String expected, String label, List<String> mismatches) {
        if (encryptedRef == null && expected == null) return;
        if (encryptedRef == null) {
            mismatches.add(label + ":OBJECT_PURGED_OR_MISSING");
            return;
        }
        try (InputStream input = storage.open(crypto.decrypt(encryptedRef))) {
            String actual = DocumentDigest.sha256(input.readAllBytes()).hex();
            if (!actual.equals(expected)) mismatches.add(label + ":CHECKSUM_MISMATCH");
        } catch (Exception e) {
            mismatches.add(label + ":OBJECT_UNREADABLE");
        }
    }

    public record IntegrityReport(Long envelopeId, boolean valid, List<String> mismatches) {}
}
