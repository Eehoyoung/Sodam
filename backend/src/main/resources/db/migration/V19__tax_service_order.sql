-- 세무 패키지 단건결제(대리수취). 확정안 §4-1·§5.
-- ⚠️ 실행은 인간 승인(마이그레이션 실행 = Stop&Ask). 작성만 선반영.

CREATE TABLE `tax_service_order` (
    `tax_service_order_id` bigint NOT NULL AUTO_INCREMENT,
    `user_id`            bigint NOT NULL,
    `package_type`       varchar(40) NOT NULL,
    `order_id`           varchar(80) NOT NULL,
    `payment_key`        varchar(200),
    `customer_amount`    int NOT NULL,
    `referral_fee`       int NOT NULL,
    `partner_payable`    int NOT NULL,
    `status`             enum('PENDING','PAID','CANCELLED','REFUNDED') NOT NULL,
    `created_at`         datetime(6) NOT NULL,
    `paid_at`            datetime(6),
    `updated_at`         datetime(6),
    PRIMARY KEY (`tax_service_order_id`)
) ENGINE=InnoDB;

ALTER TABLE `tax_service_order` ADD CONSTRAINT `UK_tax_order_order_id` UNIQUE (`order_id`);
CREATE INDEX idx_tax_order_user ON `tax_service_order` (`user_id`);
CREATE INDEX idx_tax_order_status ON `tax_service_order` (`status`);
ALTER TABLE `tax_service_order`
    ADD CONSTRAINT `FK_tax_order_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);
