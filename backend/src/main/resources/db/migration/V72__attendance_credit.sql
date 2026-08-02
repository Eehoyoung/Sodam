-- 출근권(AttendanceCredit) — 사장 전용 채용 재화 지갑/원장/체크인 로그
-- (recruitment-monetization-gamification-plan.md §2, §5, §7, Phase A)
--
-- attendance_credit: 지갑(잔액 캐시). balance는 지급/소모 시점에만 갱신되는 캐시이며,
--   무료 지급분의 만료는 서비스 레이어가 lazy 판정한다(배치 없음). 낙관적 락(version)으로
--   동시 소모 요청을 방지한다.
-- attendance_credit_transaction: append-only 거래 원장. 공급성(양수) 거래는
--   remaining_quantity로 FIFO 소모/만료 스윕 대상을 추적한다.
-- attendance_credit_check_in: 하루 1건(unique) 출석체크 로그 — 중복 체크인 최종 방어 +
--   이번 주 출석 그리드 조회용.

CREATE TABLE attendance_credit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    balance INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    last_check_in_date DATE NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_attendance_credit_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_attendance_credit_owner UNIQUE (owner_user_id)
);

CREATE TABLE attendance_credit_transaction (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    reason VARCHAR(30) NOT NULL,
    quantity INT NOT NULL,
    remaining_quantity INT NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_act_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id)
);

CREATE INDEX idx_act_owner_created ON attendance_credit_transaction (owner_user_id, created_at);
CREATE INDEX idx_act_owner_expires ON attendance_credit_transaction (owner_user_id, expires_at);

CREATE TABLE attendance_credit_check_in (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    granted_quantity INT NOT NULL,
    streak_bonus_granted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_acci_owner FOREIGN KEY (owner_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_attendance_credit_check_in UNIQUE (owner_user_id, check_in_date)
);

CREATE INDEX idx_acci_owner_date ON attendance_credit_check_in (owner_user_id, check_in_date);
