-- 퍼널 계측 이벤트 (A6). append-only 분석 로그. PII 미저장(참조키·소량 metadata만).
CREATE TABLE `domain_event` (
    `domain_event_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `event_type`      VARCHAR(40)  NOT NULL,
    `user_id`         BIGINT       NULL,
    `store_id`        BIGINT       NULL,
    `occurred_at`     DATETIME(6)  NOT NULL,
    `metadata`        VARCHAR(500) NULL,
    PRIMARY KEY (`domain_event_id`),
    KEY `idx_domain_event_store_time` (`store_id`, `occurred_at`),
    KEY `idx_domain_event_type_time` (`event_type`, `occurred_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
