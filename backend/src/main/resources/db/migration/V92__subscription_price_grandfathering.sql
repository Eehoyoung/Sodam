-- 260815 소담 포지셔닝 전환 계획서 WP-8: 가격 구조 배선(실행 아님)
--
-- 배경: 가격을 PlanType enum 하드코딩에서 설정(PlanPricingProperties)으로 분리하는 작업의
-- 일부. 가입 시점 가격을 구독 레코드에 고정해, 이후 카탈로그 가격이 바뀌어도 기존 가입자는
-- 가입 당시 가격을 그대로 유지하게 한다(grandfathering) — 약관법상 불이익 변경 사전고지 없이
-- 소급 인상하지 않기 위함.
--
-- 이 마이그레이션 자체는 가격 숫자를 바꾸지 않는다(게이트 H-7 대상 아님). 컬럼만 추가하고
-- 전부 NULL로 둔다 — NULL이면 서비스 코드가 현재 카탈로그 가격(PlanType enum 기본값)으로
-- 자연 폴백하므로 기존 구독자의 청구 금액은 이 마이그레이션 전후로 동일하다.
--
-- PlanType enum 은 건드리지 않는다 — 선언 순서가 곧 티어 서열이라 중간 삽입이 금지돼 있다.

ALTER TABLE subscription
    ADD COLUMN price_at_signup_krw INT NULL COMMENT '가입 시점 잠금 월정액(원). NULL=현재 카탈로그 가격 따름(grandfathering)',
    ADD COLUMN price_variant VARCHAR(20) NULL COMMENT 'A/B 가격 실험 그룹 배정(베타 실측용). NULL=실험 미대상';
