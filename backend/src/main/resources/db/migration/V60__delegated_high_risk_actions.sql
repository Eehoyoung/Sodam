ALTER TABLE `labor_contract`
    ADD COLUMN `signing_actor_user_id` BIGINT NULL,
    ADD COLUMN `delegated_by_master_id` BIGINT NULL,
    ADD COLUMN `delegation_envelope_id` BIGINT NULL,
    ADD COLUMN `delegation_version` INT NULL,
    ADD CONSTRAINT `fk_labor_contract_signing_actor`
        FOREIGN KEY (`signing_actor_user_id`) REFERENCES `user` (`user_id`),
    ADD CONSTRAINT `fk_labor_contract_delegated_master`
        FOREIGN KEY (`delegated_by_master_id`) REFERENCES `user` (`user_id`),
    ADD CONSTRAINT `fk_labor_contract_delegation_envelope`
        FOREIGN KEY (`delegation_envelope_id`) REFERENCES `electronic_signature_envelope` (`id`);

CREATE INDEX `idx_labor_contract_delegation`
    ON `labor_contract` (`delegation_envelope_id`, `delegation_version`);

ALTER TABLE `electronic_signature_envelope`
    ADD COLUMN `signing_actor_user_id` BIGINT NULL,
    ADD COLUMN `delegated_by_master_id` BIGINT NULL,
    ADD COLUMN `authority_envelope_id` BIGINT NULL,
    ADD COLUMN `authority_version` INT NULL,
    ADD CONSTRAINT `fk_esign_signing_actor`
        FOREIGN KEY (`signing_actor_user_id`) REFERENCES `user` (`user_id`),
    ADD CONSTRAINT `fk_esign_delegated_master`
        FOREIGN KEY (`delegated_by_master_id`) REFERENCES `user` (`user_id`),
    ADD CONSTRAINT `fk_esign_authority_envelope`
        FOREIGN KEY (`authority_envelope_id`) REFERENCES `electronic_signature_envelope` (`id`);

CREATE INDEX `idx_esign_authority_envelope`
    ON `electronic_signature_envelope` (`authority_envelope_id`, `authority_version`);
