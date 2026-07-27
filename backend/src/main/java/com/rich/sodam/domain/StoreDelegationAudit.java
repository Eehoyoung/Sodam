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

    /**
     * 감사 대상 행위가 어느 클라이언트 경로로 수행됐는지 — 04_보안정책.md §8, 06_DB_마이그레이션계획.md §2.2.
     * 사장님 웹 콘솔(세션 인증) 구간에서 기록되는 항목은 WEB, 기존 모바일 앱(JWT 인증) 구간은 MOBILE.
     * 기본값 MOBILE — 기존 호출부(모바일 전용)는 변경 없이 이 기본값을 그대로 사용한다.
     */
    public enum AccessChannel { WEB, MOBILE }

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
    @Enumerated(EnumType.STRING)
    @Column(name = "access_channel", nullable = false, length = 10)
    private AccessChannel accessChannel = AccessChannel.MOBILE;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static StoreDelegationAudit of(Long storeId, Long employeeId, Long delegatedByMasterId,
                                          Long actorUserId, ActorType actorType, Action action,
                                          Set<ManagerPermission> permissions, int delegationVersion,
                                          Long envelopeId, String documentSha256, String reason) {
        return of(storeId, employeeId, delegatedByMasterId, actorUserId, actorType, action,
                permissions, delegationVersion, envelopeId, documentSha256, reason, AccessChannel.MOBILE);
    }

    /**
     * 접근 채널을 명시하는 오버로드 — 웹 콘솔(세션) 경로에서 감사로그를 남길 때 사용.
     * 기존 {@link #of(Long, Long, Long, Long, ActorType, Action, Set, int, Long, String, String)} 는
     * 이 메서드에 AccessChannel.MOBILE 을 고정 전달하는 얇은 위임으로 남아 기존 호출부를 건드리지 않는다.
     */
    public static StoreDelegationAudit of(Long storeId, Long employeeId, Long delegatedByMasterId,
                                          Long actorUserId, ActorType actorType, Action action,
                                          Set<ManagerPermission> permissions, int delegationVersion,
                                          Long envelopeId, String documentSha256, String reason,
                                          AccessChannel accessChannel) {
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
        audit.accessChannel = accessChannel != null ? accessChannel : AccessChannel.MOBILE;
        audit.createdAt = LocalDateTime.now();
        return audit;
    }
}
