-- 근로계약서(근로기준법 §17 — 서면 명시·교부) 보관 테이블.
CREATE TABLE `labor_contract` (
    `labor_contract_id`        BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`              BIGINT       NOT NULL,
    `store_id`                 BIGINT       NOT NULL,
    `start_date`               DATE         NULL,
    `end_date`                 DATE         NULL,
    `hourly_wage`              INT          NULL,
    `wage_payment_day`         INT          NULL,
    `contracted_hours_per_week` DOUBLE      NULL,
    `weekly_holiday_day`       VARCHAR(16)  NULL,
    `annual_leave_note`        VARCHAR(500) NULL,
    `work_location`            VARCHAR(255) NULL,
    `job_description`          VARCHAR(500) NULL,
    `employee_signed_at`       DATETIME(6)  NULL,
    `created_at`               DATETIME(6)  NULL,
    `updated_at`               DATETIME(6)  NULL,
    PRIMARY KEY (`labor_contract_id`),
    KEY `idx_labor_contract_emp_store` (`employee_id`, `store_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
