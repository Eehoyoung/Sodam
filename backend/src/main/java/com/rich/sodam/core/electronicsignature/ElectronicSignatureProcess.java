package com.rich.sodam.core.electronicsignature;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * 단건 전자서명의 공급자 독립 상태머신.
 * 검증 응답의 PII가 요청자와 일치하고 signedData가 있을 때만 VERIFIED가 된다.
 */
public final class ElectronicSignatureProcess {
    private final ElectronicSignatureProvider provider;
    private final SignerIdentity expectedSigner;
    private ElectronicSignatureProcessStatus status = ElectronicSignatureProcessStatus.CREATED;
    private String receiptId;
    private Instant requestedAt;
    private Instant completedAt;
    private Instant expiresAt;
    private Instant verifiedAt;
    private int verificationAttempts;
    private int verificationResultsApplied;

    private ElectronicSignatureProcess(ElectronicSignatureProvider provider, SignerIdentity expectedSigner) {
        this.provider = Objects.requireNonNull(provider, "provider");
        this.expectedSigner = Objects.requireNonNull(expectedSigner, "expectedSigner");
    }

    public static ElectronicSignatureProcess create(
            ElectronicSignatureProvider provider, SignerIdentity expectedSigner) {
        return new ElectronicSignatureProcess(provider, expectedSigner);
    }

    public void markRequested(
            ElectronicSignatureReceipt receipt, Instant requestedAt, Instant expiresAt) {
        requireStatus(ElectronicSignatureProcessStatus.CREATED);
        this.receiptId = Objects.requireNonNull(receipt, "receipt").receiptId();
        this.requestedAt = Objects.requireNonNull(requestedAt, "requestedAt");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
        if (!expiresAt.isAfter(requestedAt)) {
            throw new IllegalArgumentException("전자서명 만료시각은 요청시각 이후여야 합니다.");
        }
        this.status = ElectronicSignatureProcessStatus.PENDING;
    }

    public void observe(ElectronicSignatureStatus observed) {
        Objects.requireNonNull(observed, "observed");
        if (status.terminal()) {
            ElectronicSignatureProcessStatus incoming = map(observed.status());
            if (status != incoming) {
                throw new IllegalStateException("완료된 전자서명 상태를 되돌릴 수 없습니다.");
            }
            return;
        }
        if (status != ElectronicSignatureProcessStatus.PENDING
                && status != ElectronicSignatureProcessStatus.COMPLETED) {
            throw new IllegalStateException("아직 공급자 요청이 생성되지 않았습니다.");
        }

        ElectronicSignatureProcessStatus incoming = map(observed.status());
        if (status == ElectronicSignatureProcessStatus.COMPLETED
                && incoming != ElectronicSignatureProcessStatus.COMPLETED) {
            throw new IllegalStateException("서명 완료 상태를 이전 상태로 되돌릴 수 없습니다.");
        }
        if (incoming == ElectronicSignatureProcessStatus.COMPLETED) {
            if (provider.policy().verificationWindow().isPresent()
                    && observed.completedAt() == null) {
                throw new IllegalArgumentException("공급자 완료시각이 필요합니다.");
            }
            this.completedAt = observed.completedAt();
        }
        if (observed.expiresAt() != null) this.expiresAt = observed.expiresAt();
        this.status = incoming;
    }

    public void beginVerification(Instant now) {
        Objects.requireNonNull(now, "now");
        requireStatus(ElectronicSignatureProcessStatus.COMPLETED);
        ElectronicSignatureProviderPolicy policy = provider.policy();
        if (verificationAttempts >= policy.maxVerificationAttempts()) {
            throw new IllegalStateException("공급자 검증 횟수를 초과했습니다.");
        }
        policy.verificationWindow().ifPresent(window -> verifyWithinWindow(now, window));
        verificationAttempts++;
    }

    public VerificationDecision applyVerification(
            ElectronicSignatureVerification verification, Instant now) {
        Objects.requireNonNull(verification, "verification");
        Objects.requireNonNull(now, "now");
        requireStatus(ElectronicSignatureProcessStatus.COMPLETED);
        if (verificationAttempts <= verificationResultsApplied) {
            throw new IllegalStateException("검증 시도 기록 없이 결과를 적용할 수 없습니다.");
        }
        verificationResultsApplied++;
        if (verification.status() != ProviderSignatureStatus.COMPLETED) {
            if (verificationAttempts >= provider.policy().maxVerificationAttempts()) {
                status = ElectronicSignatureProcessStatus.FAILED;
            }
            return VerificationDecision.rejected(VerificationFailureReason.PROVIDER_NOT_COMPLETED);
        }
        if (!expectedSigner.matches(verification.signer())) {
            status = ElectronicSignatureProcessStatus.FAILED;
            return VerificationDecision.rejected(VerificationFailureReason.IDENTITY_MISMATCH);
        }
        if (verification.signedData() == null || verification.signedData().isBlank()) {
            status = ElectronicSignatureProcessStatus.FAILED;
            return VerificationDecision.rejected(VerificationFailureReason.SIGNED_DATA_MISSING);
        }
        status = ElectronicSignatureProcessStatus.VERIFIED;
        verifiedAt = now;
        return VerificationDecision.acceptedDecision();
    }

    private void verifyWithinWindow(Instant now, Duration window) {
        if (completedAt == null || now.isAfter(completedAt.plus(window))) {
            throw new IllegalStateException("공급자 검증 가능 시간이 지났습니다.");
        }
    }

    private ElectronicSignatureProcessStatus map(ProviderSignatureStatus providerStatus) {
        return switch (providerStatus) {
            case PENDING -> ElectronicSignatureProcessStatus.PENDING;
            case COMPLETED -> ElectronicSignatureProcessStatus.COMPLETED;
            case EXPIRED -> ElectronicSignatureProcessStatus.EXPIRED;
            case DECLINED -> ElectronicSignatureProcessStatus.DECLINED;
            case FAILED -> ElectronicSignatureProcessStatus.FAILED;
        };
    }

    private void requireStatus(ElectronicSignatureProcessStatus expected) {
        if (status != expected) {
            throw new IllegalStateException("전자서명 상태가 " + expected + "가 아닙니다.");
        }
    }

    public ElectronicSignatureProvider provider() { return provider; }
    public ElectronicSignatureProcessStatus status() { return status; }
    public String receiptId() { return receiptId; }
    public Instant requestedAt() { return requestedAt; }
    public Instant completedAt() { return completedAt; }
    public Instant expiresAt() { return expiresAt; }
    public Instant verifiedAt() { return verifiedAt; }
    public int verificationAttempts() { return verificationAttempts; }
}
