-- Phase 7(DB_OPTIMIZATION_PLAN.md §2.13, A단계 — 2026-07-07 사용자 승인) — business_entity 대리키
-- 테이블 신설 + 기존 매장 전량 1:1 자동 백필 + store.business_entity_id FK 추가.
-- 자연키(사업자등록번호)를 FK로 전파하지 않는다는 §2.10의 결론을 그대로 따른다 — business_entity는
-- 사업자등록번호 원문을 다시 저장하지 않고, §2.6 블라인드 인덱스(business_number_search_hash)만
-- 중복 사업자 감지용으로 재사용한다.
--
-- 이번 A단계는 스키마 도입 + 백필까지만 포함한다(API/화면 변경 없음, 계획서 §2.13 로드맵 표 참조).
-- business_entity_id는 nullable로 둔다 — 이 마이그레이션 이후 새로 생성되는 매장은 B단계(매장 그룹핑
-- UI)에서 등록 플로우가 함께 배선되기 전까지 이 값이 채워지지 않는다(의도된 설계, 계획서 §2.13 "제안
-- 모델" 참조).

CREATE TABLE business_entity (
    id                          BIGINT       NOT NULL AUTO_INCREMENT,
    name                        VARCHAR(255) NOT NULL,
    representative_user_id      BIGINT       NULL,
    business_number_search_hash CHAR(64)     NULL,
    entity_type                 VARCHAR(30)  NOT NULL,
    created_at                  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_business_entity_business_number_search_hash (business_number_search_hash),
    KEY idx_business_entity_representative_user (representative_user_id),
    CONSTRAINT fk_business_entity_representative_user
        FOREIGN KEY (representative_user_id) REFERENCES `user` (user_id) ON DELETE SET NULL
);

ALTER TABLE store
    ADD COLUMN business_entity_id BIGINT NULL,
    ADD INDEX idx_store_business_entity_id (business_entity_id),
    ADD CONSTRAINT fk_store_business_entity
        FOREIGN KEY (business_entity_id) REFERENCES business_entity (id) ON DELETE RESTRICT;

-- 백필 — store_code로 상관관계를 맺는다(매장마다 UNIQUE + NOT NULL이 보장되는 유일한 컬럼).
-- business_number_search_hash는 Phase 0 이전에 생성된 레거시 로우에서 NULL일 수 있어(§Phase 0 실행
-- 노트 참조) 상관관계 키로 쓸 수 없다 — store_code를 임시 브리지 컬럼으로 쓰고 백필 후 제거한다.
ALTER TABLE business_entity ADD COLUMN backfill_store_code VARCHAR(255) NULL;

INSERT INTO business_entity
    (name, representative_user_id, business_number_search_hash, entity_type, created_at, backfill_store_code)
SELECT
    s.store_name,
    (SELECT msr.master_id
       FROM master_store_relation msr
      WHERE msr.store_id = s.store_id
      ORDER BY msr.master_id
      LIMIT 1),
    s.business_number_search_hash,
    'INDIVIDUAL_MULTI_STORE',
    NOW(),
    s.store_code
FROM store s;

UPDATE store s
JOIN business_entity be ON be.backfill_store_code = s.store_code
SET s.business_entity_id = be.id;

ALTER TABLE business_entity DROP COLUMN backfill_store_code;

-- ⚠️ 운영 적용 전 확인 권장: 아래 카운트가 반드시 일치해야 한다(계획서 §3 Phase 7 "검증" 항목).
--   SELECT COUNT(*) FROM store;
--   SELECT COUNT(*) FROM business_entity;
--   SELECT COUNT(*) FROM store WHERE business_entity_id IS NULL;  -- 0이어야 정상(신규 매장 제외)
