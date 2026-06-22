-- 매장 공지 + 읽음확인 (M-NEW-04/E-NEW-06). 단방향 공지 + 읽음확인만(채팅 아님).
-- 작성만 — 실행(마이그레이션)은 인간 승인 필요.

CREATE TABLE `store_notice` (
    `store_notice_id` BIGINT        NOT NULL AUTO_INCREMENT,
    `store_id`        BIGINT        NOT NULL,
    `title`           VARCHAR(100)  NOT NULL,
    `body`            VARCHAR(2000) NOT NULL,
    `created_at`      DATETIME(6)   NOT NULL,
    PRIMARY KEY (`store_notice_id`),
    KEY `idx_store_notice_store` (`store_id`, `created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- 읽음확인. (notice_id, employee_id) 유니크로 멱등성 보장(중복 ack 무시).
-- employee_id = EmployeeProfile.id (= User.id).
CREATE TABLE `notice_read` (
    `notice_read_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `notice_id`      BIGINT      NOT NULL,
    `employee_id`    BIGINT      NOT NULL,
    `read_at`        DATETIME(6) NOT NULL,
    PRIMARY KEY (`notice_read_id`),
    UNIQUE KEY `uq_notice_read_notice_emp` (`notice_id`, `employee_id`),
    KEY `idx_notice_read_emp` (`employee_id`),
    KEY `idx_notice_read_notice` (`notice_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
