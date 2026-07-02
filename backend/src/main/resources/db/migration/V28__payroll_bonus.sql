-- 즉시 보너스(비정기 포상금) 기록 테이블.
-- INCLUDED_IN_PAYROLL 건은 급여 정산 시 자동 합산되고 included_in_payroll_id 가 채워져 중복 합산을 막는다.
CREATE TABLE `payroll_bonus` (
    `payroll_bonus_id`      BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`           BIGINT       NOT NULL,
    `store_id`              BIGINT       NOT NULL,
    `bonus_date`            DATE         NOT NULL,
    `amount`                INT          NOT NULL,
    `reason`                VARCHAR(300) NULL,
    `payment_timing`        VARCHAR(30)  NOT NULL COMMENT 'IMMEDIATE_CASH/INCLUDED_IN_PAYROLL',
    `included_in_payroll_id` BIGINT      NULL COMMENT '합산된 급여 id (합산 전 NULL)',
    `created_by_master_id`  BIGINT       NOT NULL,
    `created_at`            DATETIME(6)  NULL,
    PRIMARY KEY (`payroll_bonus_id`),
    KEY `idx_payroll_bonus_emp_store_date` (`employee_id`, `store_id`, `bonus_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- 급여명세서에 보너스 합산액을 별도 항목으로 표기.
ALTER TABLE payroll
    ADD COLUMN bonus_wage INT NULL COMMENT '즉시 보너스 합산액(원) — INCLUDED_IN_PAYROLL 건만';
