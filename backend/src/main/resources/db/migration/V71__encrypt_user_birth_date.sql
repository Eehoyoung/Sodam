-- birth_date is PII.  The JPA converter stores new/updated values as AES-GCM text.
-- Existing DATE values become ISO strings and remain readable until the controlled backfill runs.
ALTER TABLE `user`
    MODIFY COLUMN `birth_date` VARCHAR(255) NULL;
