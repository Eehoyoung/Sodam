package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 보존기간이 만료돼 파기 대기 상태로 표시된 로우(DB_OPTIMIZATION_PLAN.md §2.2(c)).
 *
 * <p>원본 테이블 스키마를 건드리지 않고 이 테이블 하나만 폴링해도 전체 파기 대상을 판정할 수 있다.
 * 만료일에 즉시 삭제하지 않고 {@code scheduledPurgeAt}(만료일+30일)까지 유예를 둔 뒤, 그 사이
 * 30/15/1일 전 이메일 고지(정책 확정)를 거쳐 실제 파기한다. 법적 분쟁 계류 중인 건은
 * {@code legalHold=true}로 표시하면 만료돼도 파기 대상에서 제외된다.</p>
 */
@Entity
@Table(name = "retention_purge_schedule",
        uniqueConstraints = @UniqueConstraint(name = "uq_retention_schedule_entity",
                columnNames = {"table_name", "entity_id"}),
        indexes = {
                @Index(name = "idx_retention_schedule_purge_at", columnList = "scheduled_purge_at"),
                @Index(name = "idx_retention_schedule_table", columnList = "table_name")
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RetentionPurgeSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 원본 테이블명(예: "domain_event") — RetentionPolicy.tableName 과 일치. */
    @Column(name = "table_name", nullable = false, length = 64)
    private String tableName;

    /** 원본 테이블의 PK 값. */
    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "retention_expires_at", nullable = false)
    private LocalDateTime retentionExpiresAt;

    @Column(name = "scheduled_purge_at", nullable = false)
    private LocalDateTime scheduledPurgeAt;

    @Column(name = "notice_30d_sent_at")
    private LocalDateTime notice30dSentAt;

    @Column(name = "notice_15d_sent_at")
    private LocalDateTime notice15dSentAt;

    @Column(name = "notice_1d_sent_at")
    private LocalDateTime notice1dSentAt;

    @Column(name = "legal_hold", nullable = false)
    private boolean legalHold = false;

    @Column(name = "legal_hold_reason", length = 500)
    private String legalHoldReason;

    @Column(name = "purged_at")
    private LocalDateTime purgedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RetentionPurgeSchedule(String tableName, Long entityId,
                                   LocalDateTime retentionExpiresAt, LocalDateTime scheduledPurgeAt) {
        this.tableName = tableName;
        this.entityId = entityId;
        this.retentionExpiresAt = retentionExpiresAt;
        this.scheduledPurgeAt = scheduledPurgeAt;
        this.createdAt = LocalDateTime.now();
    }

    public boolean isPurged() {
        return purgedAt != null;
    }

    public boolean isDueForPurge(LocalDateTime now) {
        return !legalHold && !isPurged() && !scheduledPurgeAt.isAfter(now);
    }

    public void markPurged() {
        this.purgedAt = LocalDateTime.now();
    }

    /** 법적 분쟁 계류 등으로 파기를 보류한다 — 배치 설계 시 §2.2(c) 요구사항. */
    public void placeLegalHold(String reason) {
        this.legalHold = true;
        this.legalHoldReason = reason;
    }

    public void releaseLegalHold() {
        this.legalHold = false;
        this.legalHoldReason = null;
    }
}
