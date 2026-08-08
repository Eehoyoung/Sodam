-- PRO 점포 수 쿼터 (260807 마스터 실행계획서 WP-B)
--
-- 배경: 요금제 화면은 PRO 를 "멀티매장 1개 포함"으로 고지해 왔는데 실제 코드에는 매장 수 제한이
-- 전혀 없어, 고지보다 과다 제공되고 있었다. 이 마이그레이션은 그 상한을 도입하되
-- 기존 사용자를 소급 차단하지 않기 위한 grandfathering 값을 함께 채운다.
--
-- PlanType enum 은 건드리지 않는다 — 선언 순서가 곧 티어 서열이라 중간 삽입이 금지돼 있다.
-- 대신 구독 단위 애드온 컬럼으로 상한을 조정한다.

ALTER TABLE subscription
    ADD COLUMN store_quota INT NULL COMMENT '매장 수 상한(애드온). NULL 이면 플랜 기본값';

-- grandfathering: 현재 활성 구독자가 이미 보유한 매장 수를 상한으로 고정한다.
-- PRO 기본 상한(2)보다 많이 운영 중이던 사장님만 대상 — 그 이하는 NULL(플랜 기본값)로 둔다.
-- PREMIUM 은 "멀티매장 무제한"으로 고지했으므로 애초에 쿼터 대상이 아니다(코드에서 제외).
UPDATE subscription s
SET s.store_quota = (
    SELECT COUNT(*)
    FROM master_store_relation msr
    WHERE msr.master_id = s.user_id
)
WHERE s.status = 'ACTIVE'
  AND s.plan = 'PRO'
  AND (
    SELECT COUNT(*)
    FROM master_store_relation msr2
    WHERE msr2.master_id = s.user_id
  ) > 2;
