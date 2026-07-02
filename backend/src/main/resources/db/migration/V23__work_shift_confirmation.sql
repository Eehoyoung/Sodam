ALTER TABLE `work_shift`
    ADD COLUMN `confirmed_at` DATETIME(6) NULL AFTER `created_at`,
    ADD COLUMN `confirmation_notification_sent_at` DATETIME(6) NULL AFTER `confirmed_at`;

UPDATE `work_shift`
SET `confirmed_at` = `created_at`,
    `confirmation_notification_sent_at` = `created_at`
WHERE `confirmed_at` IS NULL;
