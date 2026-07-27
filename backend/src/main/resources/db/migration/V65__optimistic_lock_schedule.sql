-- 낙관적 락(@Version) 컬럼 추가 — 스케줄 계열 (Phase 2, 06_DB_마이그레이션계획.md §2.1)
ALTER TABLE work_shift ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shift_template ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shift_template_entry ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shift_swap_request ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE shift_swap_applicant ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE time_off ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
