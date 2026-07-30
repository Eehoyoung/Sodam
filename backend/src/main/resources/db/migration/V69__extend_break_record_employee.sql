-- 직원 실시간 휴게 시작/종료 기록 지원 (L-NEW-04 확장). 급여 계산과 무관 — 순수 기록/증빙용.
-- 기존 사장 사후입력 경로(BreakRecordCreateRequest)는 recorded_by='MASTER', break_start_time/end_time NULL 유지.
ALTER TABLE break_record
    ADD COLUMN recorded_by VARCHAR(20) NOT NULL DEFAULT 'MASTER',
    ADD COLUMN break_start_time DATETIME NULL,
    ADD COLUMN break_end_time DATETIME NULL;
