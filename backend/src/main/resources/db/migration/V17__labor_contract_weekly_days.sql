-- 근로계약서에 1주 소정근로일 수 추가 (근로기준법 §55 시행령 §30).
-- 계약 저장 시 직원-매장 관계(employee_store_relation.contracted_weekly_days)로 전달되어
-- 주휴수당 개근 판정 분모로 사용된다(폴백 과지급 방지).
ALTER TABLE `labor_contract`
    ADD COLUMN `contracted_weekly_days` INT NULL AFTER `contracted_hours_per_week`;
