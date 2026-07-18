-- 근로계약서 "발송" 게이트 추가.
-- 기존에는 사장이 create()만 호출하고 send()를 아직/영영 호출하지 않아도 직원의 "내 근로계약서"
-- 목록·서명·PDF 조회에서 곧바로 보이고 서명까지 가능했다(발송 전 검토 단계 없음).
-- sent_at 이 null 인 계약은 "작성(임시저장)" 상태로 간주해 직원에게 노출되지 않는다.
ALTER TABLE `labor_contract`
    ADD COLUMN `sent_at` DATETIME(6) NULL COMMENT '사장이 실제로 발송한 일시. null이면 아직 작성(임시저장) 단계';

-- 이 마이그레이션 이전에 생성된 계약은 발송 게이트가 없던 시절 이미 직원에게 노출됐을 수 있으므로,
-- 회귀(갑자기 안 보이거나 서명 불가) 방지를 위해 생성 시각을 발송 시각으로 백필한다.
-- 신규 게이트(발송 전 비공개)는 이 마이그레이션 이후 새로 생성되는 계약부터 적용된다.
UPDATE `labor_contract` SET `sent_at` = `created_at` WHERE `sent_at` IS NULL;
