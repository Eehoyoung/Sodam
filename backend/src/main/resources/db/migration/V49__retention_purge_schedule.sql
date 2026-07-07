-- Phase 6(DB_OPTIMIZATION_PLAN.md §2.2(c), §2.5): 보존기간 만료 로우를 "파기 대기"로 표시하는
-- 전용 테이블 — 원본 테이블 스키마를 건드리지 않고 RetentionPurgeService 가 이 테이블 하나만
-- 폴링해도 전체 파기 대상을 판정할 수 있게 한다. 30일 유예 + 30/15/1일 전 고지 정책(§2.2(c) 확정)을
-- 위한 컬럼을 포함한다.

CREATE TABLE retention_purge_schedule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    entity_id BIGINT NOT NULL,
    retention_expires_at DATETIME NOT NULL,
    scheduled_purge_at DATETIME NOT NULL,
    notice_30d_sent_at DATETIME NULL,
    notice_15d_sent_at DATETIME NULL,
    notice_1d_sent_at DATETIME NULL,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold_reason VARCHAR(500) NULL,
    purged_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT uq_retention_schedule_entity UNIQUE (table_name, entity_id)
);

CREATE INDEX idx_retention_schedule_purge_at ON retention_purge_schedule (scheduled_purge_at);
CREATE INDEX idx_retention_schedule_table ON retention_purge_schedule (table_name);
