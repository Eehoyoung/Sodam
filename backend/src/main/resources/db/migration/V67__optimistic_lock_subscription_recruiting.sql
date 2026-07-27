-- Phase 4 (구독·구인채용) 낙관적 락 @Version 컬럼 추가
-- 05_동시성제어_및_고급아키텍처.md §2, 06_DB_마이그레이션계획.md §2.1
ALTER TABLE subscription ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE job_posting ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE job_application ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
