ALTER TABLE `employee_store_relation`
    ADD COLUMN `store_role` VARCHAR(20) NOT NULL DEFAULT 'STAFF',
    ADD COLUMN `granted_permissions` VARCHAR(1000) NOT NULL DEFAULT '[]',
    ADD COLUMN `manager_appointed_at` DATETIME NULL,
    ADD COLUMN `manager_accepted_at` DATETIME NULL,
    ADD COLUMN `manager_signature_envelope_id` BIGINT NULL,
    ADD COLUMN `manager_delegation_version` INT NOT NULL DEFAULT 0;

CREATE INDEX `idx_relation_store_role_active`
    ON `employee_store_relation` (`store_id`, `store_role`, `is_active`);

CREATE TABLE `store_delegation_audit` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `store_id` BIGINT NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `delegated_by_master_id` BIGINT NULL,
    `actor_user_id` BIGINT NULL,
    `actor_type` VARCHAR(20) NOT NULL,
    `action` VARCHAR(30) NOT NULL,
    `permissions_snapshot` VARCHAR(1000) NOT NULL,
    `delegation_version` INT NOT NULL,
    `signature_envelope_id` BIGINT NULL,
    `document_sha256` VARCHAR(64) NULL,
    `reason` VARCHAR(500) NULL,
    `created_at` DATETIME NOT NULL,
    CONSTRAINT `fk_delegation_audit_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
    CONSTRAINT `fk_delegation_audit_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_profile` (`user_id`)
);

CREATE INDEX `idx_delegation_audit_store_created`
    ON `store_delegation_audit` (`store_id`, `created_at`);
CREATE INDEX `idx_delegation_audit_employee`
    ON `store_delegation_audit` (`employee_id`);
