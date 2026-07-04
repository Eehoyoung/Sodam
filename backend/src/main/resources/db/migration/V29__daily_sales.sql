-- 일일 매출 테이블 — 사장이 하루 총매출을 입력, 인건비율(labor-ratio) 산출의 분모.
-- (store_id, sale_date) 유니크 — 같은 날 재입력은 upsert(수정).
CREATE TABLE `daily_sales` (
    `daily_sales_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `store_id`       BIGINT      NOT NULL,
    `sale_date`      DATE        NOT NULL,
    `amount`         BIGINT      NOT NULL COMMENT '매출액(원, 0 이상)',
    `created_at`     DATETIME(6) NULL,
    `updated_at`     DATETIME(6) NULL,
    PRIMARY KEY (`daily_sales_id`),
    UNIQUE KEY `uk_daily_sales_store_date` (`store_id`, `sale_date`),
    KEY `idx_daily_sales_store_date` (`store_id`, `sale_date`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
