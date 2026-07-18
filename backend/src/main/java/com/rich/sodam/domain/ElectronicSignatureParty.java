package com.rich.sodam.domain;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.domain.type.SignaturePartyStatus;
import com.rich.sodam.domain.type.SignatureSignerRole;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signature_party",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_esign_party_order", columnNames = {"envelope_id", "signing_order"}),
                @UniqueConstraint(name = "uk_esign_provider_receipt", columnNames = {"provider", "receipt_ref_hmac"})
        }, indexes = @Index(name = "idx_esign_party_status", columnList = "status, expires_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ElectronicSignatureParty {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "envelope_id", nullable = false)
    private ElectronicSignatureEnvelope envelope;
    @Enumerated(EnumType.STRING) @Column(name = "signer_role", nullable = false, length = 30)
    private SignatureSignerRole signerRole;
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "signing_order", nullable = false)
    private int signingOrder;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ElectronicSignatureProvider provider;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private SignaturePartyStatus status;
    @Column(name = "receipt_ref_enc", length = 1000)
    private String receiptRefEnc;
    @Column(name = "receipt_ref_hmac", length = 64)
    private String receiptRefHmac;
    @Column(name = "signed_data_object_ref_enc", length = 1000)
    private String signedDataObjectRefEnc;
    @Column(name = "signed_data_sha256", length = 64)
    private String signedDataSha256;
    @Column(name = "requested_at") private LocalDateTime requestedAt;
    @Column(name = "provider_completed_at") private LocalDateTime providerCompletedAt;
    @Column(name = "verified_at") private LocalDateTime verifiedAt;
    @Column(name = "expires_at") private LocalDateTime expiresAt;
    @Column(name = "verification_attempts", nullable = false) private int verificationAttempts;
    @Version @Column(nullable = false) private Long version;

    public static ElectronicSignatureParty waiting(ElectronicSignatureEnvelope envelope, SignatureSignerRole role,
                                                     Long userId, int order, ElectronicSignatureProvider provider) {
        if (envelope == null || role == null || order < 1 || provider == null) {
            throw new IllegalArgumentException("전자서명 party 입력이 올바르지 않습니다.");
        }
        ElectronicSignatureParty party = new ElectronicSignatureParty();
        party.envelope = envelope;
        party.signerRole = role;
        party.userId = userId;
        party.signingOrder = order;
        party.provider = provider;
        party.status = SignaturePartyStatus.WAITING;
        return party;
    }

    public void queueRequest() {
        if (status != SignaturePartyStatus.WAITING) throw new IllegalStateException("요청 대기 party가 아닙니다.");
        status = SignaturePartyStatus.REQUEST_QUEUED;
    }

    public void markRequested(String receiptRefEnc, String receiptRefHmac, LocalDateTime requestedAt,
                              LocalDateTime expiresAt) {
        if (status != SignaturePartyStatus.REQUEST_QUEUED || receiptRefEnc == null || receiptRefHmac == null
                || requestedAt == null || expiresAt == null || !expiresAt.isAfter(requestedAt)) {
            throw new IllegalStateException("전자서명 요청 결과를 적용할 수 없습니다.");
        }
        this.receiptRefEnc = receiptRefEnc;
        this.receiptRefHmac = receiptRefHmac;
        this.requestedAt = requestedAt;
        this.expiresAt = expiresAt;
        this.status = SignaturePartyStatus.PENDING;
    }

    public void observeProviderCompleted(LocalDateTime completedAt) {
        if (status != SignaturePartyStatus.PENDING || completedAt == null) {
            throw new IllegalStateException("공급자 완료 상태를 적용할 수 없습니다.");
        }
        providerCompletedAt = completedAt;
        status = SignaturePartyStatus.PROVIDER_COMPLETED;
    }

    public void queueVerification() {
        if (status != SignaturePartyStatus.PROVIDER_COMPLETED) throw new IllegalStateException("검증 대기 상태가 아닙니다.");
        status = SignaturePartyStatus.VERIFY_QUEUED;
    }

    public void beginVerification() {
        if (status != SignaturePartyStatus.VERIFY_QUEUED) throw new IllegalStateException("검증을 시작할 수 없습니다.");
        if (verificationAttempts >= provider.policy().maxVerificationAttempts()) {
            status = SignaturePartyStatus.MANUAL_REISSUE_REQUIRED;
            throw new IllegalStateException("공급자 검증 횟수를 초과했습니다.");
        }
        verificationAttempts++;
        status = SignaturePartyStatus.VERIFYING;
    }

    public void markVerified(String objectRefEnc, String signedDataSha256, LocalDateTime now) {
        if (status != SignaturePartyStatus.VERIFYING || objectRefEnc == null || objectRefEnc.isBlank()
                || signedDataSha256 == null || !signedDataSha256.matches("[0-9a-f]{64}")) {
            throw new IllegalStateException("검증 증적을 적용할 수 없습니다.");
        }
        this.signedDataObjectRefEnc = objectRefEnc;
        this.signedDataSha256 = signedDataSha256;
        this.verifiedAt = now;
        this.status = SignaturePartyStatus.VERIFIED;
    }

    public void retryVerification() {
        if (status != SignaturePartyStatus.VERIFYING) {
            throw new IllegalStateException("검증 재시도 상태가 아닙니다.");
        }
        status = SignaturePartyStatus.VERIFY_QUEUED;
    }

    public void terminate(SignaturePartyStatus terminal) {
        if (terminal == null || !terminal.terminal() || terminal == SignaturePartyStatus.VERIFIED) {
            throw new IllegalArgumentException("party 종료 상태가 올바르지 않습니다.");
        }
        status = terminal;
    }

    public void purgeSensitiveReferences() {
        if (status != SignaturePartyStatus.VERIFIED) {
            throw new IllegalStateException("검증 완료된 서명자 증적만 파기할 수 있습니다.");
        }
        receiptRefEnc = null;
        receiptRefHmac = null;
        signedDataObjectRefEnc = null;
    }
}
