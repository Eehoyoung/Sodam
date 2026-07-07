-- Phase 6(DB_OPTIMIZATION_PLAN.md §2.2(b)): employee_store_relation은 isActive(boolean)만 있고
-- "언제" 비활성화(퇴사) 됐는지 알 수 있는 타임스탬프가 없었다 — 근로관계 기록 3년 보존기간의
-- 기산점을 계산할 수 없는 갭이었다. 애플리케이션은 EmployeeStoreRelation.changeActive()로만
-- isActive/deactivated_at을 함께 변경한다(도메인 계층 참조).

ALTER TABLE employee_store_relation
    ADD COLUMN deactivated_at DATETIME NULL;
