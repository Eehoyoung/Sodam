-- 월급제 정규직 지각/조퇴/결근 감지·확정(AttendanceIrregularity) + 사전 신고(AttendanceNotice).
CREATE TABLE `attendance_irregularity`
(
    `air_id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`     BIGINT       NOT NULL,
    `store_id`        BIGINT       NOT NULL,
    `work_shift_id`   BIGINT       NOT NULL,
    `attendance_id`   BIGINT       NULL COMMENT '결근이면 NULL(출근 기록 자체가 없음)',
    `shift_date`      DATE         NOT NULL,
    `type`            VARCHAR(20)  NOT NULL COMMENT 'LATE/EARLY_LEAVE/ABSENCE',
    `minutes_short`   INT          NOT NULL,
    `resolution`      VARCHAR(20)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/WAIVED/DEDUCTED/CONVERTED_TO_LEAVE',
    `deducted_amount` INT          NULL,
    `note`            VARCHAR(500) NULL,
    `detected_at`     DATETIME(6)  NOT NULL,
    `resolved_by`     BIGINT       NULL,
    `resolved_at`     DATETIME(6)  NULL,
    PRIMARY KEY (`air_id`),
    UNIQUE KEY `uk_air_shift_type` (`work_shift_id`, `type`),
    KEY `idx_air_employee_store` (`employee_id`, `store_id`),
    KEY `idx_air_shift_date` (`shift_date`),
    KEY `idx_air_resolution` (`resolution`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `attendance_notice`
(
    `an_id`       BIGINT      NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT      NOT NULL,
    `store_id`    BIGINT      NOT NULL,
    `for_date`    DATE        NOT NULL,
    `type`        VARCHAR(30) NOT NULL COMMENT 'LATE_EXPECTED/EARLY_LEAVE_EXPECTED/ABSENCE_EXPECTED',
    `message`     VARCHAR(300) NULL,
    `created_at`  DATETIME(6) NOT NULL,
    PRIMARY KEY (`an_id`),
    KEY `idx_an_employee_store_date` (`employee_id`, `store_id`, `for_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
