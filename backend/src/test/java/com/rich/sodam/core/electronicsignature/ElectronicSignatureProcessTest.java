package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ElectronicSignatureProcessTest {

    private static final Instant NOW = Instant.parse("2026-07-17T00:00:00Z");
    private static final SignerIdentity SIGNER =
            new SignerIdentity("홍길동", "01012345678", "19900102");

    @Test
    void verifiesOnlyAfterProviderCompletionAndIdentityMatch() {
        ElectronicSignatureProcess process = ElectronicSignatureProcess.create(
                ElectronicSignatureProvider.NAVER, SIGNER);

        process.markRequested(new ElectronicSignatureReceipt("12345678901234567890123456789012", null, null),
                NOW, NOW.plusSeconds(300));
        process.observe(new ElectronicSignatureStatus(
                ProviderSignatureStatus.COMPLETED, NOW, null, NOW.plusSeconds(10), NOW.plusSeconds(300)));
        process.beginVerification(NOW.plusSeconds(11));
        VerificationDecision decision = process.applyVerification(new ElectronicSignatureVerification(
                ProviderSignatureStatus.COMPLETED,
                new VerifiedSignerIdentity("홍길동", "01012345678", "19900102"),
                "signed-data"), NOW.plusSeconds(12));

        assertThat(decision.accepted()).isTrue();
        assertThat(process.status()).isEqualTo(ElectronicSignatureProcessStatus.VERIFIED);
    }

    @Test
    void failsClosedWhenProviderIdentityDoesNotMatch() {
        ElectronicSignatureProcess process = completedProcess(ElectronicSignatureProvider.NAVER, NOW);
        process.beginVerification(NOW.plusSeconds(11));

        VerificationDecision decision = process.applyVerification(new ElectronicSignatureVerification(
                ProviderSignatureStatus.COMPLETED,
                new VerifiedSignerIdentity("다른사람", "01099999999", "19900102"),
                "signed-data"), NOW.plusSeconds(12));

        assertThat(decision.accepted()).isFalse();
        assertThat(decision.reason()).isEqualTo(VerificationFailureReason.IDENTITY_MISMATCH);
        assertThat(process.status()).isEqualTo(ElectronicSignatureProcessStatus.FAILED);
    }

    @Test
    void enforcesOneShotAndKakaoTenMinuteVerificationWindow() {
        ElectronicSignatureProcess naver = completedProcess(ElectronicSignatureProvider.NAVER, NOW);
        naver.beginVerification(NOW.plusSeconds(1));
        assertThatThrownBy(() -> naver.beginVerification(NOW.plusSeconds(2)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("검증 횟수");

        ElectronicSignatureProcess kakao = completedProcess(ElectronicSignatureProvider.KAKAO, NOW);
        assertThatThrownBy(() -> kakao.beginVerification(NOW.plusSeconds(601)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("검증 가능 시간");
    }

    @Test
    void tossCanUseSecondVerificationAfterIncompleteFirstResult() {
        ElectronicSignatureProcess toss = completedProcess(ElectronicSignatureProvider.TOSS, NOW);
        toss.beginVerification(NOW.plusSeconds(1));

        VerificationDecision first = toss.applyVerification(new ElectronicSignatureVerification(
                ProviderSignatureStatus.PENDING, null, null), NOW.plusSeconds(2));

        assertThat(first.accepted()).isFalse();
        assertThat(toss.status()).isEqualTo(ElectronicSignatureProcessStatus.COMPLETED);

        toss.beginVerification(NOW.plusSeconds(3));
        VerificationDecision second = toss.applyVerification(new ElectronicSignatureVerification(
                ProviderSignatureStatus.COMPLETED,
                new VerifiedSignerIdentity("홍길동", "01012345678", "19900102"),
                "signed-data"), NOW.plusSeconds(4));

        assertThat(second.accepted()).isTrue();
        assertThat(toss.status()).isEqualTo(ElectronicSignatureProcessStatus.VERIFIED);
    }

    @Test
    void terminalStateCannotMoveBackToPending() {
        ElectronicSignatureProcess process = ElectronicSignatureProcess.create(
                ElectronicSignatureProvider.TOSS, SIGNER);
        process.markRequested(new ElectronicSignatureReceipt("receipt", null, null),
                NOW, NOW.plusSeconds(300));
        process.observe(new ElectronicSignatureStatus(
                ProviderSignatureStatus.EXPIRED, NOW, null, null, NOW.plusSeconds(300)));

        assertThat(process.status()).isEqualTo(ElectronicSignatureProcessStatus.EXPIRED);
        assertThatThrownBy(() -> process.observe(new ElectronicSignatureStatus(
                ProviderSignatureStatus.PENDING, NOW, null, null, NOW.plusSeconds(300))))
                .isInstanceOf(IllegalStateException.class);
    }

    private ElectronicSignatureProcess completedProcess(ElectronicSignatureProvider provider, Instant completedAt) {
        ElectronicSignatureProcess process = ElectronicSignatureProcess.create(provider, SIGNER);
        process.markRequested(new ElectronicSignatureReceipt("receipt", null, null),
                completedAt.minusSeconds(5), completedAt.plusSeconds(300));
        process.observe(new ElectronicSignatureStatus(
                ProviderSignatureStatus.COMPLETED,
                completedAt.minusSeconds(5), null, completedAt, completedAt.plusSeconds(300)));
        return process;
    }
}
