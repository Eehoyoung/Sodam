-- 출근권 충전소(IAP) — 단건결제 주문 + 지갑 확장 컬럼
-- (recruitment-monetization-gamification-plan.md §2.4, §7, Phase C)
--
-- attendance_credit: 스트릭 복구권(단품 티켓) 카운터 + 첫 구매 2배 이벤트 소진 플래그 추가.
--   두 컬럼 모두 attendance_credit_transaction 원장(출근권 재화 전용 FIFO 풀)과는 분리된 별도 상태다
--   (V72 attendance_credit_transaction 주석 참고 — reason 무관하게 lot을 소모하는 FIFO 쿼리에
--   티켓을 섞으면 일반 소모가 티켓 lot을 갉아먹는 정합성 버그가 생긴다).
-- attendance_credit_charge_order: TaxServiceOrder(세무 패키지 단건결제)와 동일한 주문 패턴 —
--   PENDING 생성 → 토스 결제창 → 서버 confirm() 으로 PAID 전이. 웹훅 재시도/중복 콜백은
--   findByOrderIdForUpdate 비관적 락 + isPaid() 체크로 멱등 처리(AttendanceCreditChargeService).

ALTER TABLE attendance_credit
    ADD COLUMN streak_recovery_tickets INT NOT NULL DEFAULT 0,
    ADD COLUMN first_charge_bonus_granted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE attendance_credit_charge_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    pack_code VARCHAR(30) NOT NULL,
    order_id VARCHAR(80) NOT NULL,
    payment_key VARCHAR(200) NULL,
    amount_krw INT NOT NULL,
    credit_quantity INT NOT NULL,
    bonus_credit_quantity INT NOT NULL DEFAULT 0,
    ticket_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    paid_at DATETIME NULL,
    updated_at DATETIME NULL,
    CONSTRAINT fk_acco_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_acco_order_id UNIQUE (order_id)
);

CREATE INDEX idx_acco_owner ON attendance_credit_charge_order (owner_user_id);
CREATE INDEX idx_acco_status ON attendance_credit_charge_order (status);
