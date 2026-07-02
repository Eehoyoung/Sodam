-- 영수증 경량 매입장부 (F-BUY-01). 거래처·일자·품목·수량·단가 기록 → 가격비교·발주참고.
-- 스코프: 매입(사는 것) 기록·비교까지만. 재고 차감·원가율·POS 없음 (IDENTITY §8 개정).
-- PII 미저장 — 주민번호·계좌 없음. 영수증 이미지는 ref(image_ref)만.

CREATE TABLE `purchase` (
    `purchase_id`   BIGINT       NOT NULL AUTO_INCREMENT,
    `store_id`      BIGINT       NOT NULL,
    `vendor_name`   VARCHAR(100) NOT NULL,
    `purchase_date` DATE         NOT NULL,
    `category`      VARCHAR(20)  NOT NULL,
    `total_amount`  INT          NOT NULL DEFAULT 0,
    `supply_amount` INT          NULL,
    `vat_amount`    INT          NULL,
    `image_ref`     VARCHAR(300) NULL,
    `status`        VARCHAR(20)  NOT NULL,
    `memo`          VARCHAR(300) NULL,
    `created_at`    DATETIME(6)  NOT NULL,
    `updated_at`    DATETIME(6)  NULL,
    PRIMARY KEY (`purchase_id`),
    KEY `idx_purchase_store_date` (`store_id`, `purchase_date`),
    KEY `idx_purchase_store_category` (`store_id`, `category`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `purchase_item` (
    `purchase_item_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `purchase_id`      BIGINT       NOT NULL,
    `item_name`        VARCHAR(100) NOT NULL,
    `normalized_name`  VARCHAR(100) NOT NULL,
    `quantity`         DOUBLE       NOT NULL,
    `unit`             VARCHAR(20)  NULL,
    `unit_price`       INT          NOT NULL,
    `amount`           INT          NOT NULL,
    PRIMARY KEY (`purchase_item_id`),
    KEY `idx_purchase_item_norm` (`normalized_name`),
    KEY `idx_purchase_item_purchase` (`purchase_id`),
    CONSTRAINT `fk_purchase_item_purchase` FOREIGN KEY (`purchase_id`)
        REFERENCES `purchase` (`purchase_id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
