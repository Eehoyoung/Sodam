ALTER TABLE `employee_store_relation`
    ADD COLUMN `pending_manager_permissions` VARCHAR(1000) NULL,
    ADD COLUMN `pending_manager_delegation_version` INT NULL,
    ADD COLUMN `pending_manager_appointed_at` DATETIME NULL;

ALTER TABLE `labor_contract`
    ADD COLUMN `electronic_signature_envelope_id` BIGINT NULL,
    ADD COLUMN `electronic_signature_document_version` INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX `uk_labor_contract_esign_envelope`
    ON `labor_contract` (`electronic_signature_envelope_id`);

CREATE TABLE `employment_amendment` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `store_id` BIGINT NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `effective_date` DATE NOT NULL,
    `employment_type` VARCHAR(30) NOT NULL,
    `hourly_wage` INT NULL,
    `monthly_salary` INT NULL,
    `contracted_weekly_hours` DOUBLE NULL,
    `contracted_weekly_days` INT NULL,
    `status` VARCHAR(20) NOT NULL,
    `electronic_signature_envelope_id` BIGINT NULL,
    `document_version` INT NOT NULL DEFAULT 0,
    `verified_at` DATETIME NULL,
    `applied_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL,
    `version` BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT `uk_employment_amendment_envelope` UNIQUE (`electronic_signature_envelope_id`),
    CONSTRAINT `fk_employment_amendment_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
    CONSTRAINT `fk_employment_amendment_employee` FOREIGN KEY (`employee_id`) REFERENCES `user` (`user_id`),
    CONSTRAINT `fk_employment_amendment_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`),
    CONSTRAINT `fk_employment_amendment_envelope` FOREIGN KEY (`electronic_signature_envelope_id`)
        REFERENCES `electronic_signature_envelope` (`id`)
);

CREATE INDEX `idx_employment_amendment_store` ON `employment_amendment` (`store_id`, `status`);
CREATE INDEX `idx_employment_amendment_due` ON `employment_amendment` (`status`, `effective_date`);

ALTER TABLE `electronic_signature_envelope`
    MODIFY COLUMN `unsigned_object_ref_enc` VARCHAR(1000) NULL,
    ADD COLUMN `completion_manifest_sha256` VARCHAR(64) NULL;

CREATE TABLE `electronic_signature_access_audit` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `envelope_id` BIGINT NOT NULL,
    `user_id` BIGINT NULL,
    `artifact` VARCHAR(30) NOT NULL,
    `outcome` VARCHAR(20) NOT NULL,
    `accessed_at` DATETIME NOT NULL,
    CONSTRAINT `fk_esign_access_envelope` FOREIGN KEY (`envelope_id`)
        REFERENCES `electronic_signature_envelope` (`id`)
);

CREATE INDEX `idx_esign_access_envelope`
    ON `electronic_signature_access_audit` (`envelope_id`, `accessed_at`);
