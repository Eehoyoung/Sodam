-- 90일 슬립(휴면) 플래그. 수익화 확정안 §9.
-- ⚠️ 실행은 인간 승인(마이그레이션 실행 = Stop&Ask). 작성만 선반영.

ALTER TABLE `subscription` ADD COLUMN `dormant_at` datetime(6) NULL;
CREATE INDEX idx_subscription_dormant ON `subscription` (`plan`, `status`, `dormant_at`);
