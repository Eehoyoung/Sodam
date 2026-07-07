-- Phase 2(DB_OPTIMIZATION_PLAN.md §2.8): store/employee_store_relation lost-update 방지용 낙관적 락 버전 컬럼.
-- 기존 로우는 0으로 채운다(Hibernate @Version 신규 규약과 호환 — 최초 버전은 0부터 증가).

ALTER TABLE store
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE employee_store_relation
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
