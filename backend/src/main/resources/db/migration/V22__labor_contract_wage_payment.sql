-- 근로계약서 §17① 임금 지급방법·구성항목 필수기재 보강.
-- 지급방법: 계좌이체(BANK_TRANSFER)/현금(CASH). 구성항목: 기본급·수당 등 분해 메모(PII 아님).
-- 둘 다 nullable — 레거시 계약 호환(기존 행은 사장이 보완 입력).

ALTER TABLE labor_contract
    ADD COLUMN wage_payment_method VARCHAR(20) NULL COMMENT '임금 지급방법(BANK_TRANSFER/CASH) §17①',
    ADD COLUMN wage_components     VARCHAR(1000) NULL COMMENT '임금 구성항목·계산방법 명시 §17①';
