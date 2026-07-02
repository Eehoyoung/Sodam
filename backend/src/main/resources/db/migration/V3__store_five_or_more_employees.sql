-- 5인 미만 사업장 특례(근로기준법 §11·§56) 판정용: 매장에 상시근로자 5인 이상 여부 추가.
-- null = 미설정(가산 적용, 체불 방지 기본), false = 5인 미만(연장·야간·휴일 가산 제외).
ALTER TABLE `store`
    ADD COLUMN `five_or_more_employees` BIT NULL;
