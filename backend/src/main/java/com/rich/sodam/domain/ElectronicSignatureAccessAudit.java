package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "electronic_signature_access_audit", indexes =
        @Index(name = "idx_esign_access_envelope", columnList = "envelope_id, accessed_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ElectronicSignatureAccessAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "envelope_id", nullable = false) private Long envelopeId;
    @Column(name = "user_id") private Long userId;
    @Column(nullable = false, length = 30) private String artifact;
    @Column(nullable = false, length = 20) private String outcome;
    @Column(name = "accessed_at", nullable = false) private LocalDateTime accessedAt;

    public static ElectronicSignatureAccessAudit of(Long envelopeId, Long userId, String artifact, String outcome) {
        ElectronicSignatureAccessAudit audit = new ElectronicSignatureAccessAudit();
        audit.envelopeId = envelopeId;
        audit.userId = userId;
        audit.artifact = artifact;
        audit.outcome = outcome;
        audit.accessedAt = LocalDateTime.now();
        return audit;
    }
}
