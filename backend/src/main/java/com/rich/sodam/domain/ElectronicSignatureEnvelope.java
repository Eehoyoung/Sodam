package com.rich.sodam.domain;

import com.rich.sodam.domain.type.SignatureEnvelopeStatus;
import com.rich.sodam.domain.type.SignatureSubjectType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signature_envelope",
        uniqueConstraints = @UniqueConstraint(name = "uk_esign_subject_version",
                columnNames = {"subject_type", "subject_id", "document_version"}),
        indexes = {
                @Index(name = "idx_esign_envelope_store", columnList = "store_id, status"),
                @Index(name = "idx_esign_envelope_subject", columnList = "subject_type, subject_id")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ElectronicSignatureEnvelope {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "subject_type", nullable = false, length = 40)
    private SignatureSubjectType subjectType;
    @Column(name = "subject_id", nullable = false)
    private Long subjectId;
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    @Column(name = "document_version", nullable = false)
    private int documentVersion;
    @Column(name = "document_sha256", nullable = false, length = 64)
    private String documentSha256;
    @Column(name = "unsigned_object_ref_enc", length = 1000)
    private String unsignedObjectRefEnc;
    @Column(name = "completion_manifest_ref_enc", length = 1000)
    private String completionManifestRefEnc;
    @Column(name = "completion_manifest_sha256", length = 64)
    private String completionManifestSha256;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private SignatureEnvelopeStatus status;
    @Column(name = "current_signing_order", nullable = false)
    private int currentSigningOrder;
    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
    @Column(name = "signing_actor_user_id")
    private Long signingActorUserId;
    @Column(name = "delegated_by_master_id")
    private Long delegatedByMasterId;
    @Column(name = "authority_envelope_id")
    private Long authorityEnvelopeId;
    @Column(name = "authority_version")
    private Integer authorityVersion;
    @Version @Column(nullable = false)
    private Long version;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static ElectronicSignatureEnvelope create(SignatureSubjectType subjectType, Long subjectId, Long storeId,
                                                       int documentVersion, String documentSha256,
                                                       String unsignedObjectRefEnc, Long createdByUserId) {
        if (subjectType == null || subjectId == null || storeId == null || createdByUserId == null
                || documentVersion < 1 || documentSha256 == null || !documentSha256.matches("[0-9a-f]{64}")
                || unsignedObjectRefEnc == null || unsignedObjectRefEnc.isBlank()) {
            throw new IllegalArgumentException("전자서명 envelope 입력이 올바르지 않습니다.");
        }
        ElectronicSignatureEnvelope envelope = new ElectronicSignatureEnvelope();
        envelope.subjectType = subjectType;
        envelope.subjectId = subjectId;
        envelope.storeId = storeId;
        envelope.documentVersion = documentVersion;
        envelope.documentSha256 = documentSha256;
        envelope.unsignedObjectRefEnc = unsignedObjectRefEnc;
        envelope.createdByUserId = createdByUserId;
        envelope.status = SignatureEnvelopeStatus.READY;
        envelope.currentSigningOrder = 1;
        envelope.createdAt = LocalDateTime.now();
        envelope.updatedAt = envelope.createdAt;
        return envelope;
    }

    public void markInProgress() {
        if (status != SignatureEnvelopeStatus.READY && status != SignatureEnvelopeStatus.IN_PROGRESS) {
            throw new IllegalStateException("서명을 시작할 수 없는 envelope 상태입니다.");
        }
        status = SignatureEnvelopeStatus.IN_PROGRESS;
        updatedAt = LocalDateTime.now();
    }

    public void bindDelegatedAuthority(Long actorUserId, Long masterUserId,
                                       Long authorityEnvelopeId, int authorityVersion) {
        if (actorUserId == null || masterUserId == null || actorUserId.equals(masterUserId)
                || authorityEnvelopeId == null || authorityVersion < 1) {
            throw new IllegalArgumentException("전자서명 대리 권한 증적이 올바르지 않습니다.");
        }
        this.signingActorUserId = actorUserId;
        this.delegatedByMasterId = masterUserId;
        this.authorityEnvelopeId = authorityEnvelopeId;
        this.authorityVersion = authorityVersion;
    }

    public void advanceTo(int signingOrder) {
        if (status != SignatureEnvelopeStatus.IN_PROGRESS || signingOrder <= currentSigningOrder) {
            throw new IllegalStateException("전자서명 순서를 되돌리거나 건너뛸 수 없습니다.");
        }
        currentSigningOrder = signingOrder;
        updatedAt = LocalDateTime.now();
    }

    public void complete(String manifestRefEnc, String manifestSha256, LocalDateTime now) {
        if (status != SignatureEnvelopeStatus.IN_PROGRESS || manifestRefEnc == null || manifestRefEnc.isBlank()
                || manifestSha256 == null || !manifestSha256.matches("[0-9a-f]{64}")) {
            throw new IllegalStateException("전자서명 envelope를 완료할 수 없습니다.");
        }
        this.completionManifestRefEnc = manifestRefEnc;
        this.completionManifestSha256 = manifestSha256;
        this.status = SignatureEnvelopeStatus.VERIFIED;
        this.finalizedAt = now;
        this.completedAt = now;
        this.updatedAt = now;
    }

    public void purgeEvidenceObjectReferences() {
        if (status != SignatureEnvelopeStatus.VERIFIED) {
            throw new IllegalStateException("검증 완료된 전자서명 증적만 보존기간 만료 후 파기할 수 있습니다.");
        }
        this.unsignedObjectRefEnc = null;
        this.completionManifestRefEnc = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void fail(SignatureEnvelopeStatus terminalStatus) {
        if (terminalStatus == null || !terminalStatus.terminal() || terminalStatus == SignatureEnvelopeStatus.VERIFIED) {
            throw new IllegalArgumentException("종료 상태가 올바르지 않습니다.");
        }
        status = terminalStatus;
        updatedAt = LocalDateTime.now();
    }
}
