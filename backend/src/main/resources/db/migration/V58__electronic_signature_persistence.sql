CREATE TABLE `electronic_signature_envelope` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `subject_type` VARCHAR(40) NOT NULL,
    `subject_id` BIGINT NOT NULL,
    `store_id` BIGINT NOT NULL,
    `document_version` INT NOT NULL,
    `document_sha256` VARCHAR(64) NOT NULL,
    `unsigned_object_ref_enc` VARCHAR(1000) NOT NULL,
    `completion_manifest_ref_enc` VARCHAR(1000) NULL,
    `status` VARCHAR(40) NOT NULL,
    `current_signing_order` INT NOT NULL,
    `finalized_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `version` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    CONSTRAINT `uk_esign_subject_version` UNIQUE (`subject_type`, `subject_id`, `document_version`),
    CONSTRAINT `fk_esign_envelope_store` FOREIGN KEY (`store_id`) REFERENCES `store` (`store_id`),
    CONSTRAINT `fk_esign_envelope_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `user` (`user_id`)
);

CREATE INDEX `idx_esign_envelope_store` ON `electronic_signature_envelope` (`store_id`, `status`);
CREATE INDEX `idx_esign_envelope_subject` ON `electronic_signature_envelope` (`subject_type`, `subject_id`);

CREATE TABLE `electronic_signature_party` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `envelope_id` BIGINT NOT NULL,
    `signer_role` VARCHAR(30) NOT NULL,
    `user_id` BIGINT NULL,
    `signing_order` INT NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `receipt_ref_enc` VARCHAR(1000) NULL,
    `receipt_ref_hmac` VARCHAR(64) NULL,
    `signed_data_object_ref_enc` VARCHAR(1000) NULL,
    `signed_data_sha256` VARCHAR(64) NULL,
    `requested_at` DATETIME NULL,
    `provider_completed_at` DATETIME NULL,
    `verified_at` DATETIME NULL,
    `expires_at` DATETIME NULL,
    `verification_attempts` INT NOT NULL DEFAULT 0,
    `version` BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT `uk_esign_party_order` UNIQUE (`envelope_id`, `signing_order`),
    CONSTRAINT `uk_esign_provider_receipt` UNIQUE (`provider`, `receipt_ref_hmac`),
    CONSTRAINT `fk_esign_party_envelope` FOREIGN KEY (`envelope_id`) REFERENCES `electronic_signature_envelope` (`id`),
    CONSTRAINT `fk_esign_party_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
);

CREATE INDEX `idx_esign_party_status` ON `electronic_signature_party` (`status`, `expires_at`);

CREATE TABLE `electronic_signature_attempt` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `party_id` BIGINT NOT NULL,
    `operation` VARCHAR(20) NOT NULL,
    `idempotency_key` VARCHAR(160) NOT NULL,
    `result_type` VARCHAR(30) NOT NULL,
    `provider_code` VARCHAR(80) NULL,
    `attempted_at` DATETIME NOT NULL,
    `finished_at` DATETIME NULL,
    CONSTRAINT `uk_esign_attempt_idempotency` UNIQUE (`idempotency_key`),
    CONSTRAINT `fk_esign_attempt_party` FOREIGN KEY (`party_id`) REFERENCES `electronic_signature_party` (`id`)
);

CREATE INDEX `idx_esign_attempt_party` ON `electronic_signature_attempt` (`party_id`, `attempted_at`);

CREATE TABLE `electronic_signature_outbox` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `envelope_id` BIGINT NOT NULL,
    `party_id` BIGINT NULL,
    `operation` VARCHAR(20) NOT NULL,
    `idempotency_key` VARCHAR(160) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `attempt_count` INT NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME NOT NULL,
    `lease_until` DATETIME NULL,
    `last_error_class` VARCHAR(120) NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    CONSTRAINT `uk_esign_outbox_idempotency` UNIQUE (`idempotency_key`),
    CONSTRAINT `fk_esign_outbox_envelope` FOREIGN KEY (`envelope_id`) REFERENCES `electronic_signature_envelope` (`id`),
    CONSTRAINT `fk_esign_outbox_party` FOREIGN KEY (`party_id`) REFERENCES `electronic_signature_party` (`id`)
);

CREATE INDEX `idx_esign_outbox_due` ON `electronic_signature_outbox` (`status`, `next_attempt_at`, `lease_until`);

ALTER TABLE `employee_store_relation`
    ADD CONSTRAINT `fk_relation_manager_signature_envelope`
    FOREIGN KEY (`manager_signature_envelope_id`) REFERENCES `electronic_signature_envelope` (`id`);

ALTER TABLE `store_delegation_audit`
    ADD CONSTRAINT `fk_delegation_signature_envelope`
    FOREIGN KEY (`signature_envelope_id`) REFERENCES `electronic_signature_envelope` (`id`);
