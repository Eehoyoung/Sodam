package com.rich.sodam.domain;

import com.rich.sodam.domain.type.SignatureOperation;
import com.rich.sodam.domain.type.SignatureOutboxStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signature_outbox",
        uniqueConstraints = @UniqueConstraint(name = "uk_esign_outbox_idempotency", columnNames = "idempotency_key"),
        indexes = @Index(name = "idx_esign_outbox_due", columnList = "status, next_attempt_at, lease_until"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ElectronicSignatureOutbox {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "envelope_id", nullable = false) private Long envelopeId;
    @Column(name = "party_id") private Long partyId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SignatureOperation operation;
    @Column(name = "idempotency_key", nullable = false, length = 160) private String idempotencyKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private SignatureOutboxStatus status;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "next_attempt_at", nullable = false) private LocalDateTime nextAttemptAt;
    @Column(name = "lease_until") private LocalDateTime leaseUntil;
    @Column(name = "last_error_class", length = 120) private String lastErrorClass;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    public static ElectronicSignatureOutbox queue(Long envelopeId, Long partyId, SignatureOperation operation,
                                                   String idempotencyKey, LocalDateTime dueAt) {
        if (envelopeId == null || operation == null || idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("전자서명 outbox 입력이 올바르지 않습니다.");
        }
        ElectronicSignatureOutbox outbox = new ElectronicSignatureOutbox();
        outbox.envelopeId = envelopeId;
        outbox.partyId = partyId;
        outbox.operation = operation;
        outbox.idempotencyKey = idempotencyKey;
        outbox.status = SignatureOutboxStatus.PENDING;
        outbox.nextAttemptAt = dueAt == null ? LocalDateTime.now() : dueAt;
        outbox.createdAt = LocalDateTime.now();
        outbox.updatedAt = outbox.createdAt;
        return outbox;
    }

    public void lease(LocalDateTime until) {
        boolean expiredLease = status == SignatureOutboxStatus.LEASED
                && leaseUntil != null && leaseUntil.isBefore(LocalDateTime.now());
        if ((status != SignatureOutboxStatus.PENDING && status != SignatureOutboxStatus.RETRY && !expiredLease)
                || until == null || !until.isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("전자서명 outbox lease를 획득할 수 없습니다.");
        }
        status = SignatureOutboxStatus.LEASED;
        leaseUntil = until;
        attemptCount++;
        updatedAt = LocalDateTime.now();
    }

    public void complete() {
        if (status != SignatureOutboxStatus.LEASED) throw new IllegalStateException("lease된 작업이 아닙니다.");
        status = SignatureOutboxStatus.COMPLETED;
        leaseUntil = null;
        updatedAt = LocalDateTime.now();
    }

    public void retry(LocalDateTime next, String errorClass) {
        if (status != SignatureOutboxStatus.LEASED) throw new IllegalStateException("lease된 작업이 아닙니다.");
        status = SignatureOutboxStatus.RETRY;
        nextAttemptAt = next;
        lastErrorClass = errorClass;
        leaseUntil = null;
        updatedAt = LocalDateTime.now();
    }

    public void deadLetter(String errorClass) {
        status = SignatureOutboxStatus.DEAD_LETTER;
        lastErrorClass = errorClass;
        leaseUntil = null;
        updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (status == SignatureOutboxStatus.COMPLETED || status == SignatureOutboxStatus.DEAD_LETTER) return;
        status = SignatureOutboxStatus.CANCELLED;
        leaseUntil = null;
        updatedAt = LocalDateTime.now();
    }
}
