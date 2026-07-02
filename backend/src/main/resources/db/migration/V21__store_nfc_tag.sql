-- 매장-NFC 태그 매핑 (대리출근 방지의 물리적 현장 인증 복구).
-- 출근 검증 시 (store_id, tag_id) 가 active 로 등록돼 있어야만 통과 → 임의 문자열 통과(스텁) 차단.
-- 작성만 — 실행(마이그레이션)은 인간 승인 필요. (dev/test 는 ddl-auto 로 자동 생성.)
-- PII 미저장: 태그 식별자(tag_id) + 사장 라벨(label)만 보관.

CREATE TABLE `store_nfc_tag` (
    `store_nfc_tag_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `store_id`         BIGINT       NOT NULL,
    `tag_id`           VARCHAR(128) NOT NULL,
    `label`            VARCHAR(100) DEFAULT NULL,
    `active`           BIT(1)       NOT NULL DEFAULT b'1',
    `created_at`       DATETIME(6)  NOT NULL,
    PRIMARY KEY (`store_nfc_tag_id`),
    UNIQUE KEY `uq_store_nfc_tag_tag_id` (`tag_id`),
    KEY `idx_store_nfc_tag_store` (`store_id`),
    CONSTRAINT `fk_store_nfc_tag_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
