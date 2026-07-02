-- 주휴수당 개근 정확 판정용: 직원-매장 관계에 1주 소정근로일 수 추가.
-- null 허용 — 기존 행은 미설정(폴백 유지), 신규/수정 시 사장이 입력.
-- 근거: 근로기준법 §55, 시행령 §30 (1주 소정근로일 개근 시 주휴 발생).
ALTER TABLE `employee_store_relation`
    ADD COLUMN `contracted_weekly_days` INTEGER NULL;
