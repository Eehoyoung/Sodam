-- 근무 시프트 (B10/E-NEW-05). 사장이 직원 근무 일정을 등록, 직원이 본인 일정 조회.
-- 스코프: 등록·조회만 — 채용·구인·자동배정 없음(Non-Goal).
CREATE TABLE `work_shift` (
    `work_shift_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`   BIGINT       NOT NULL,
    `store_id`      BIGINT       NOT NULL,
    `shift_date`    DATE         NOT NULL,
    `start_time`    TIME         NOT NULL,
    `end_time`      TIME         NOT NULL,
    `memo`          VARCHAR(200) NULL,
    `created_at`    DATETIME(6)  NOT NULL,
    PRIMARY KEY (`work_shift_id`),
    KEY `idx_work_shift_store_date` (`store_id`, `shift_date`),
    KEY `idx_work_shift_emp_date` (`employee_id`, `shift_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
