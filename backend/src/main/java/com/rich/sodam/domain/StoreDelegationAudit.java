package com.rich.sodam.domain;

import com.rich.sodam.config.converter.ManagerPermissionSetConverter;
import com.rich.sodam.domain.type.ManagerPermission;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;

@Entity
@Table(name = "store_delegation_audit", indexes = {
        @Index(name = "idx_delegation_audit_store_created", columnList = "store_id, created_at"),
        @Index(name = "idx_delegation_audit_employee", columnList = "employee_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoreDelegationAudit {

    public enum Action { GRANT_DRAFTED, SIGN_REQUESTED, SIGN_VERIFIED, ACTIVATED, MODIFIED, EXPANSION_STAGED, REVOKED, AUTO_REVOKED, FROZEN, PAYROLL_CONFIRMED, CONTRACT_DELEGATION_USED }
    public enum ActorType { MASTER, MANAGER, SYSTEM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    @Column(name = "delegated_by_master_id")
    private Long delegatedByMasterId;
    @Column(name = "actor_user_id")
    private Long actorUserId;
    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private ActorType actorType;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Action action;
    @Convert(converter = ManagerPermissionSetConverter.class)
    @Column(name = "permissions_snapshot", nullable = false, length = 1000)
    private Set<ManagerPermission> permissionsSnapshot = EnumSet.noneOf(ManagerPermission.class);
    @Column(name = "delegation_version", nullable = false)
    private int delegationVersion;
    @Column(name = "signature_envelope_id")
    private Long signatureEnvelopeId;
    @Column(name = "document_sha256", length = 64)
    private String documentSha256;
    @Column(length = 500)
    private String reason;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static StoreDelegationAudit of(Long storeId, Long employeeId, Long delegatedByMasterId,
                                          Long actorUserId, ActorType actorType, Action action,
                                          Set<ManagerPermission> permissions, int delegationVersion,
                                          Long envelopeId, String documentSha256, String reason) {
        StoreDelegationAudit audit = new StoreDelegationAudit();
        audit.storeId = storeId;
        audit.employeeId = employeeId;
        audit.delegatedByMasterId = delegatedByMasterId;
        audit.actorUserId = actorUserId;
        audit.actorType = actorType;
        audit.action = action;
        audit.permissionsSnapshot = permissions == null || permissions.isEmpty()
                ? EnumSet.noneOf(ManagerPermission.class) : EnumSet.copyOf(permissions);
        audit.delegationVersion = delegationVersion;
        audit.signatureEnvelopeId = envelopeId;
        audit.documentSha256 = documentSha256;
        audit.reason = reason;
        audit.createdAt = LocalDateTime.now();
        return audit;
    }
}
