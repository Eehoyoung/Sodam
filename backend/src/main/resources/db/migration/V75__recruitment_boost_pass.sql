-- 채용 부스트 무제한 패스 — 사장(User) 단위 3/7/30일 기간제 애드온
-- (recruitment-monetization-gamification-plan.md §2.5, §7)
--
-- recruitment_boost_pass: 지갑(만료 시각 모델). active_until 이 null 이거나 과거면 비활성.
--   연장(구매) 시 스택형으로 이어붙인다(RecruitmentBoostPass 클래스 주석 참고). 낙관적 락(version)
--   으로 동시 연장 요청을 방지한다.
-- recruitment_boost_pass_order: AttendanceCreditChargeOrder(출근권 충전소)와 동일한 주문 패턴 —
--   PENDING 생성 → 토스 결제창 → 서버 confirm() 으로 PAID 전이. 웹훅 재시도/중복 콜백은
--   findByOrderIdForUpdate 비관적 락 + isPaid() 체크로 멱등 처리(RecruitmentBoostPassService).

CREATE TABLE recruitment_boost_pass (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    active_until DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_recruitment_boost_pass_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_recruitment_boost_pass_owner UNIQUE (owner_user_id)
);

CREATE TABLE recruitment_boost_pass_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    product_code VARCHAR(30) NOT NULL,
    order_id VARCHAR(80) NOT NULL,
    payment_key VARCHAR(200) NULL,
    amount_krw INT NOT NULL,
    duration_days INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL,
    paid_at DATETIME NULL,
    updated_at DATETIME NULL,
    CONSTRAINT fk_rbpo_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_rbpo_order_id UNIQUE (order_id)
);

CREATE INDEX idx_rbpo_owner ON recruitment_boost_pass_order (owner_user_id);
CREATE INDEX idx_rbpo_status ON recruitment_boost_pass_order (status);
