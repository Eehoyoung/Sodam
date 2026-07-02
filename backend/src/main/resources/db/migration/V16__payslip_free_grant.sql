-- 명세서 월1회 무료발급 카운터 (B4/GR-NEW-04). 매장×년월당 1건(unique).
-- 키-레디: 카운터만. 실제 페이월 게이팅 활성화는 인간 승인.
CREATE TABLE `payslip_free_grant` (
    `payslip_free_grant_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `store_id`              BIGINT      NOT NULL,
    `year_month_key`        VARCHAR(7)  NOT NULL,
    `granted_at`            DATETIME(6) NOT NULL,
    PRIMARY KEY (`payslip_free_grant_id`),
    UNIQUE KEY `uq_payslip_free_grant` (`store_id`, `year_month_key`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
