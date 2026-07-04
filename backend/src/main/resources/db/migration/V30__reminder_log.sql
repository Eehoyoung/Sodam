-- 사장 리마인더 발송 이력 — 배치(OwnerReminderScheduler) 멱등성 키.
-- (store_id, reminder_type, target_date) 유니크 — 같은 날 배치 재실행돼도 중복 발송 금지.
CREATE TABLE `reminder_log` (
    `reminder_log_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `store_id`        BIGINT      NOT NULL,
    `reminder_type`   VARCHAR(30) NOT NULL COMMENT 'SALES_CLOSE_REMINDER/SALES_YESTERDAY_REMINDER/PAYDAY_D3/WEEKLY_REPORT',
    `target_date`     DATE        NOT NULL COMMENT '리마인더 대상일(매출일/급여일/주 시작일)',
    `created_at`      DATETIME(6) NULL,
    PRIMARY KEY (`reminder_log_id`),
    UNIQUE KEY `uk_reminder_log_store_type_date` (`store_id`, `reminder_type`, `target_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
