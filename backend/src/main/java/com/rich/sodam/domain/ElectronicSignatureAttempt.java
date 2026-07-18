package com.rich.sodam.domain;

import com.rich.sodam.domain.type.SignatureOperation;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signature_attempt",
        uniqueConstraints = @UniqueConstraint(name = "uk_esign_attempt_idempotency", columnNames = "idempotency_key"),
        indexes = @Index(name = "idx_esign_attempt_party", columnList = "party_id, attempted_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ElectronicSignatureAttempt {
    public enum ResultType { STARTED, SUCCEEDED, RETRYABLE_FAILURE, TERMINAL_FAILURE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "party_id", nullable = false) private Long partyId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SignatureOperation operation;
    @Column(name = "idempotency_key", nullable = false, length = 160) private String idempotencyKey;
    @Enumerated(EnumType.STRING) @Column(name = "result_type", nullable = false, length = 30) private ResultType resultType;
    @Column(name = "provider_code", length = 80) private String providerCode;
    @Column(name = "attempted_at", nullable = false) private LocalDateTime attemptedAt;
    @Column(name = "finished_at") private LocalDateTime finishedAt;

    public static ElectronicSignatureAttempt started(Long partyId, SignatureOperation operation, String key) {
        ElectronicSignatureAttempt attempt = new ElectronicSignatureAttempt();
        attempt.partyId = partyId;
        attempt.operation = operation;
        attempt.idempotencyKey = key;
        attempt.resultType = ResultType.STARTED;
        attempt.attemptedAt = LocalDateTime.now();
        return attempt;
    }

    public void finish(ResultType result, String providerCode) {
        if (result == null || result == ResultType.STARTED) throw new IllegalArgumentException("완료 결과가 필요합니다.");
        this.resultType = result;
        this.providerCode = providerCode;
        this.finishedAt = LocalDateTime.now();
    }
}
