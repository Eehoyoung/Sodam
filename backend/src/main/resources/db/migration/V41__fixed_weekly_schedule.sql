-- 월급제 정규직 고정 스케줄 자동 생성 지원.
-- fixed_weekly_schedule_json: 근로계약서 발송 시 채워지는 요일별 근무 패턴(원본은 labor_contract와 동일 포맷).
-- fixed_schedule_generated_through: 이 패턴으로 실제 근무 시프트(work_shift)가 생성 완료된 마지막 날짜.
--   이 날짜 이전 구간은 사장이 스케줄 보드에서 이동/삭제했더라도 자동 생성이 다시 건드리지 않는다.
ALTER TABLE `employee_store_relation`
    ADD COLUMN `fixed_weekly_schedule_json` VARCHAR(2000) NULL COMMENT '월급제 정규직 고정 스케줄(요일별 근무 패턴 JSON). null=고정 스케줄 없음',
    ADD COLUMN `fixed_schedule_generated_through` DATE NULL COMMENT '고정 스케줄이 근무 시프트로 생성 완료된 마지막 날짜(포함)';
