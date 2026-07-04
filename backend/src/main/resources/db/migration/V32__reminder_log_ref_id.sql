-- 지각·미출근 감지(SHIFT_LATE)는 같은 날 같은 매장에서 직원(시프트)별로 따로 발송돼야 하므로
-- (store_id, reminder_type, target_date) 만으로는 멱등키가 부족하다.
-- nullable ref_id(=work_shift_id) 를 추가하고 유니크를 4컬럼으로 교체한다.
-- 기존 룰(매출/급여일/주간리포트)은 ref_id NULL 그대로 사용 — 기존 행과 호환.
ALTER TABLE `reminder_log`
    ADD COLUMN `ref_id` BIGINT NULL COMMENT '리마인더 참조 ID(SHIFT_LATE=work_shift_id, 기존 룰은 NULL)' AFTER `target_date`;

ALTER TABLE `reminder_log`
    DROP INDEX `uk_reminder_log_store_type_date`;

ALTER TABLE `reminder_log`
    ADD UNIQUE KEY `uk_reminder_log_store_type_date_ref` (`store_id`, `reminder_type`, `target_date`, `ref_id`);
