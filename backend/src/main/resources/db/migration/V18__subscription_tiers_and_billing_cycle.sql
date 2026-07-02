-- 수익화 확정안 v3.1 §1, §9: 티어 재편(FREE/STARTER/PRO/PREMIUM) + 청구주기 + 일시정지 + 결제 멱등성.
-- ⚠️ 실행은 인간 승인 필수(마이그레이션 실행 = Stop&Ask). 작성만 선반영.

-- 1) plan enum 재편 + 레거시 데이터 리맵 (BUSINESS→PRO, COMMISSION→FREE)
ALTER TABLE `subscription`
    MODIFY `plan` enum('FREE','STARTER','PRO','PREMIUM','BUSINESS','COMMISSION') NOT NULL;
UPDATE `subscription` SET `plan` = 'PRO'  WHERE `plan` = 'BUSINESS';
UPDATE `subscription` SET `plan` = 'FREE' WHERE `plan` = 'COMMISSION';
ALTER TABLE `subscription`
    MODIFY `plan` enum('FREE','STARTER','PRO','PREMIUM') NOT NULL;

-- 2) status 에 PAUSED 추가
ALTER TABLE `subscription`
    MODIFY `status` enum('ACTIVE','CANCELLED','EXPIRED','PAST_DUE','PENDING_PAYMENT','PAUSED') NOT NULL;

-- 3) 청구주기 + 일시정지 시각
ALTER TABLE `subscription`
    ADD COLUMN `billing_cycle` enum('MONTHLY','HALF_YEARLY','YEARLY') NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE `subscription`
    ADD COLUMN `paused_at` datetime(6) NULL;

-- 4) 결제 멱등성: 청구 대상 기간(yyyy-MM). 동일 구독·기간 SUCCESS 1건이면 재청구 차단.
ALTER TABLE `payment_history`
    ADD COLUMN `billing_period` varchar(7) NULL;
CREATE INDEX idx_payment_history_sub_period ON `payment_history` (`subscription_id`, `billing_period`);
