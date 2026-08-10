-- G-11 세무 증빙 live 발급 선결 2건.
--
-- 1) pass_through_amount_krw: 수취액 중 제3자에게 그대로 전달되는 예수금(대리수취분).
--    세무 서비스 상품은 customerAmount = referralFee(소담 매출) + partnerPayable(세무사 전달분)
--    구조라, 전액을 공급가액으로 발급하면 부가세 과세표준이 실매출보다 과대계상된다.
--    다른 과금은 0 이라 기본값으로 그대로 정합한다.
--
-- 2) amendment_reference / amended_at: 이미 발급된 증빙이 환불될 때의 수정세금계산서
--    (부가가치세법 시행령 §70) 통지 결과. 이전에는 내부 상태만 CANCELLED 로 바꿔서
--    발급된 건이 환불되면 수정발급 미이행 상태가 조용히 남았다.
--    status 는 문자열 컬럼이라 AMEND_PENDING 값 추가에 스키마 변경이 필요 없다.
ALTER TABLE payment_receipt
    ADD COLUMN pass_through_amount_krw INT NOT NULL DEFAULT 0,
    ADD COLUMN amendment_reference VARCHAR(160) NULL,
    ADD COLUMN amended_at DATETIME NULL;
