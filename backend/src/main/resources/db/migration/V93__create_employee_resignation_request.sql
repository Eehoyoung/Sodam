-- 260817 퇴사 처리 기능 계획서 WP-1: 직원 사직서 제출·철회·사장 확인.
--
-- desired_resignation_date/agreed_resignation_date는 데이터 캡처 전용이다(HC-1) — 급여 계산
-- (payroll/core/payroll)이나 보존기간 기산(retention) 로직 어디에서도 참조하지 않는다.
-- status는 PENDING/WITHDRAWN/ACKNOWLEDGED 세 값만 쓴다(HC-7) — 사직은 근로자의 일방적
-- 의사표시라 사장이 "거절"할 수 없다(민법 §660).

CREATE TABLE employee_resignation_request (
    id BIGINT NOT NULL AUTO_INCREMENT,
    relation_id BIGINT NOT NULL,
    requester_id BIGINT NOT NULL,
    desired_resignation_date DATE NOT NULL,
    agreed_resignation_date DATE NULL,
    reason VARCHAR(200) NULL,
    status VARCHAR(20) NOT NULL,
    requested_at DATETIME NOT NULL,
    decided_at DATETIME NULL,
    signature_envelope_id BIGINT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_resignation_request_relation (relation_id),
    INDEX idx_resignation_request_requester (requester_id),
    INDEX idx_resignation_request_status (status)
);
