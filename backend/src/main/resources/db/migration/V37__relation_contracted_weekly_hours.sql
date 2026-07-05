-- 근로계약서 ↔ 정산 정합성 동기화.
-- 1) 주 소정근로시간 약정을 직원-매장 관계에 전파해 월급제 통상시급 분모를
--    계약서 정규화(주 소정 + 주휴 × 4.345주)와 동일하게 맞춘다.
--    (기존: 소정근로일수 × 일 8h 가정 → 단시간 월급제(주 5일·일 4h)에서 분모가 209h로
--    과대해져 §56 가산·결근 공제가 계약서 통상시급의 절반으로 과소 계산되던 버그)
ALTER TABLE `employee_store_relation`
    ADD COLUMN `contracted_weekly_hours` DOUBLE NULL COMMENT '1주 소정근로시간 약정(근로계약서 전파) — 월급제 통상시급 분모. NULL=미설정(소정근로일수 폴백)';

-- 2) 전환 이력 수행자 완화: 근로계약서 저장 경유 등 내부 전파 경로는 명시적 수행자가
--    없을 수 있다(서비스 직접 호출·배치). API 경로는 항상 principal 을 기록한다.
ALTER TABLE `employment_type_change_log`
    MODIFY COLUMN `changed_by` BIGINT NULL COMMENT '변경 수행자 userId(계약서 저장 등 내부 전파로 주체 미상이면 NULL)';
