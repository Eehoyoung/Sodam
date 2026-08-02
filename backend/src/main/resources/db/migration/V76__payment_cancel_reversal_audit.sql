-- 결제취소 웹훅에 의한 재화/기간 회수(claw-back) 감사 로그
-- (recruitment-monetization-gamification-plan.md §12.2 — 세무 검토 대응: 환불금액과 회수량이
-- 얼마나 연동됐는지 추후 세무조사 대응 시 DB에서 직접 조회 가능하도록 별도 테이블로 남긴다)

CREATE TABLE payment_cancel_reversal_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_type VARCHAR(40) NOT NULL,
    order_id VARCHAR(80) NOT NULL,
    owner_user_id BIGINT NOT NULL,
    webhook_status VARCHAR(20) NOT NULL,
    original_amount_krw INT NOT NULL,
    resolved_cancel_amount_krw INT NULL,
    cancel_ratio DECIMAL(8, 6) NOT NULL,
    quantity_unit VARCHAR(30) NOT NULL,
    requested_reverse_quantity INT NOT NULL,
    actual_reverse_quantity INT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_pcra_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id)
);

CREATE INDEX idx_pcra_order ON payment_cancel_reversal_audit (order_id);
CREATE INDEX idx_pcra_owner ON payment_cancel_reversal_audit (owner_user_id);
