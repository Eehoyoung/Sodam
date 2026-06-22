-- 휴게 부여 증빙 (L-NEW-04, 근로기준법 §54). 사장이 실제 휴게를 줬다는 기록.
-- 임금계산과 독립 — Attendance/근로시간 계산을 변경하지 않는 별도 증빙 테이블.
-- 임금체불 진정 시 부여 증빙으로 사용.
CREATE TABLE `break_record` (
    `break_record_id`   BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`       BIGINT       NOT NULL,
    `store_id`          BIGINT       NOT NULL,
    `work_date`         DATE         NOT NULL,
    `break_minutes`     INT          NOT NULL,
    `granted_confirmed` BIT          NOT NULL,
    `memo`              VARCHAR(300) NULL,
    `created_at`        DATETIME(6)  NOT NULL,
    PRIMARY KEY (`break_record_id`),
    KEY `idx_break_emp_store_date` (`employee_id`, `store_id`, `work_date`),
    KEY `idx_break_store_date` (`store_id`, `work_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
