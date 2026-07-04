-- 대타 구하기(시프트 스왑) — 사장이 시프트를 대타 모집으로 전환, 직원이 지원, 사장이 승인.
-- shift_swap_request: 시프트당 OPEN 모집은 앱 레벨에서 1건만 허용(생성 시 존재 체크).
-- shift_swap_applicant: (swap_request_id, employee_id) 유니크 — 중복 지원 차단(DB 레벨).
CREATE TABLE `shift_swap_request` (
    `shift_swap_request_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `shift_id`              BIGINT      NOT NULL,
    `store_id`              BIGINT      NOT NULL,
    `original_employee_id`  BIGINT      NULL COMMENT '원 배정 직원(퇴사 등으로 없을 수 있음)',
    `status`                VARCHAR(20) NOT NULL COMMENT 'OPEN/FILLED/CANCELLED',
    `approved_employee_id`  BIGINT      NULL COMMENT '승인된 대타 직원',
    `created_at`            DATETIME(6) NULL,
    PRIMARY KEY (`shift_swap_request_id`),
    KEY `idx_ssr_store_status` (`store_id`, `status`),
    KEY `idx_ssr_shift` (`shift_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `shift_swap_applicant` (
    `shift_swap_applicant_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `swap_request_id`         BIGINT      NOT NULL,
    `employee_id`             BIGINT      NOT NULL,
    `applied_at`              DATETIME(6) NULL,
    PRIMARY KEY (`shift_swap_applicant_id`),
    UNIQUE KEY `uk_ssa_request_employee` (`swap_request_id`, `employee_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
