package com.rich.sodam.domain;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.domain.type.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ElectronicSignaturePartyTest {
    @Test
    void evidenceReferenceAndHashAreRequiredBeforeVerified() {
        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.MANAGER_DELEGATION, 1L, 2L, 1, "a".repeat(64), "v1.k1.cipher", 3L);
        ElectronicSignatureParty party = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, 3L, 1, ElectronicSignatureProvider.NAVER);
        party.queueRequest();
        LocalDateTime now = LocalDateTime.now();
        party.markRequested("receipt-cipher", "b".repeat(64), now, now.plusMinutes(10));
        party.observeProviderCompleted(now.plusSeconds(1));
        party.queueVerification();
        party.beginVerification();

        assertThatThrownBy(() -> party.markVerified(null, "c".repeat(64), now.plusSeconds(2)))
                .isInstanceOf(IllegalStateException.class);
        party.markVerified("object-ref-cipher", "c".repeat(64), now.plusSeconds(2));
        assertThat(party.getStatus()).isEqualTo(SignaturePartyStatus.VERIFIED);
        assertThat(party.getVerificationAttempts()).isOne();
    }

    @Test
    void naverVerificationCannotBeStartedTwice() {
        ElectronicSignatureEnvelope envelope = ElectronicSignatureEnvelope.create(
                SignatureSubjectType.MANAGER_DELEGATION, 1L, 2L, 1, "a".repeat(64), "cipher", 3L);
        ElectronicSignatureParty party = ElectronicSignatureParty.waiting(
                envelope, SignatureSignerRole.OWNER, 3L, 1, ElectronicSignatureProvider.NAVER);
        party.queueRequest();
        LocalDateTime now = LocalDateTime.now();
        party.markRequested("receipt", "b".repeat(64), now, now.plusMinutes(10));
        party.observeProviderCompleted(now);
        party.queueVerification();
        party.beginVerification();
        party.retryVerification();

        assertThatThrownBy(party::beginVerification)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("횟수");
        assertThat(party.getStatus()).isEqualTo(SignaturePartyStatus.MANUAL_REISSUE_REQUIRED);
    }
}
