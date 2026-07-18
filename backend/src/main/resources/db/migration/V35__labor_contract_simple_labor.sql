-- 수습 최저임금 감액 가능 여부 판단을 위해 단순노무업무 해당 여부를 저장한다.
-- 최저임금법 §5② 단서: 단순노무업무 근로자는 수습 중이어도 최저임금 감액 대상에서 제외.
ALTER TABLE labor_contract
    ADD COLUMN simple_labor BOOLEAN NOT NULL DEFAULT TRUE COMMENT '단순노무업무 해당 여부';
