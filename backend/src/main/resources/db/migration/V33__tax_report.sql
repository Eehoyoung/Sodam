-- 세무사 송부: 매장별 세무사 이메일 + 인건비 내역서 발송 이력.
-- 발송 이력은 중복 발송 확인·분쟁 시 증빙용 (언제/누구에게/어떤 정산기간을 보냈는지).
ALTER TABLE `store`
    ADD COLUMN `tax_accountant_email` VARCHAR(255) NULL COMMENT '세무사(신고 대리인) 이메일';

CREATE TABLE `tax_report_send_log` (
    `tax_report_send_log_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `store_id`               BIGINT       NOT NULL,
    `period_start`           DATE         NOT NULL COMMENT '정산기간 시작일',
    `period_end`             DATE         NOT NULL COMMENT '정산기간 종료일',
    `recipient_email`        VARCHAR(255) NOT NULL COMMENT '수신 세무사 이메일(발송 시점 스냅샷)',
    `payroll_count`          INT          NOT NULL COMMENT '첨부된 급여 건수',
    `total_gross_wage`       BIGINT       NOT NULL COMMENT '기간 세전 지급총액(원)',
    `status`                 VARCHAR(20)  NOT NULL COMMENT 'SENT/FAILED',
    `fail_reason`            VARCHAR(500) NULL,
    `sent_by`                BIGINT       NOT NULL COMMENT '발송 트리거한 사장 userId',
    `sent_at`                DATETIME(6)  NOT NULL,
    PRIMARY KEY (`tax_report_send_log_id`),
    KEY `idx_trsl_store_period` (`store_id`, `period_start`, `period_end`),
    CONSTRAINT `fk_trsl_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
