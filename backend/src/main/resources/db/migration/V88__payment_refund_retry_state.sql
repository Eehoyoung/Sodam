-- 환불 재시도 안전성: PG 취소가 실제로 성공했는지와 시도 횟수를 신청 row 에 보존한다.
-- 이 값이 없으면 후속 처리(권리 회수·증빙 취소)만 실패한 재시도에서 이미 취소된 결제에
-- 중복 취소가 나간다.
ALTER TABLE payment_refund_request
    ADD COLUMN pg_cancelled_at DATETIME NULL,
    ADD COLUMN attempt_count INT NOT NULL DEFAULT 0;
