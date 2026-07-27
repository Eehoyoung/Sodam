-- 낙관적 락(@Version) 컬럼 추가 — 출퇴근 계열 (Phase 2, 06_DB_마이그레이션계획.md §2.1)
ALTER TABLE attendance ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE attendance_approval_request ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE attendance_correction_request ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE attendance_irregularity ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE break_record ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
