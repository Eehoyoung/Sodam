-- 약관 동의 이력(버전관리·동의 입증, PIPA) + 위치정보 동의 컬럼.
-- 카카오 등 소셜 가입의 동의 우회(G-2)를 후속 동의 수집으로 닫기 위한 인프라.

ALTER TABLE `user`
    ADD COLUMN `location_info_agreed_at` DATETIME(6) NULL;

CREATE TABLE `terms_agreement` (
    `terms_agreement_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`            BIGINT       NOT NULL,
    `terms_type`         VARCHAR(40)  NOT NULL,
    `terms_version`      VARCHAR(40)  NOT NULL,
    `agreed`             BIT          NOT NULL,
    `recorded_at`        DATETIME(6)  NOT NULL,
    PRIMARY KEY (`terms_agreement_id`),
    KEY `idx_terms_agreement_user` (`user_id`, `terms_type`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
