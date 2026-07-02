-- PIPA §21: 회원 탈퇴 시점 기록 + PII 익명화 완료 시점 마커.
-- withdrawn_at      : 탈퇴 시각. 90일 경과 시 UserDataRetentionScheduler 가 PII 익명화.
-- pii_anonymized_at : 익명화 완료 시각. 배치 중복 처리 방지(NULL = 미처리).
ALTER TABLE `user`
    ADD COLUMN `withdrawn_at` DATETIME(6) NULL,
    ADD COLUMN `pii_anonymized_at` DATETIME(6) NULL;

-- 탈퇴 후 보관기간 경과분 조회 성능 보조 인덱스.
CREATE INDEX `idx_user_withdrawn_at` ON `user` (`withdrawn_at`);
