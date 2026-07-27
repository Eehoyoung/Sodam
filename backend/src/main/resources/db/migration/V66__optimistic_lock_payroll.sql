-- Phase 3 (급여) 낙관적 락 @Version 컬럼 추가
-- 05_동시성제어_및_고급아키텍처.md §2, 06_DB_마이그레이션계획.md §2.1
ALTER TABLE payroll ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payroll_detail ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payroll_policy ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payroll_bonus ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payslip_free_grant ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
