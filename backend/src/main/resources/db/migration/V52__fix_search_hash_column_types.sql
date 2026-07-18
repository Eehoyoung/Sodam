-- Phase 3(DB_OPTIMIZATION_PLAN.md, Flyway 거버넌스 전환) 중 실측으로 발견한 버그 수정.
--
-- V43/V47/V51이 블라인드 인덱스 해시 컬럼을 CHAR(64)로 만들었지만, 대응하는 JPA 엔티티는 모두
-- 평범한 `@Column(length = 64) private String ...` 매핑이다 — Hibernate는 String 필드를 항상
-- VARCHAR로 추론하므로, ddl-auto=update(스키마를 검증 없이 그냥 맞춰줌)에서는 이 불일치가 조용히
-- 묻혀 있었다. 이번 세션에서 로컬 docker-compose를 ddl-auto=validate + Flyway로 전환(Phase 3)하고
-- 나서야 부팅 자체가 실패하는 것으로 실측 발견했다 — CHAR(64)로 남겨두려면 엔티티에
-- `columnDefinition = "CHAR(64)"`를 주는 방법도 시도했지만, Hibernate의 스키마 검증기는
-- columnDefinition 문자열과 무관하게 Java 타입(String)에서 유도한 VARCHAR와 실제 컬럼의 CHAR를
-- 비교해 여전히 실패한다(DDL 생성에만 반영되고 검증 로직에는 반영 안 되는 Hibernate 6.x의 알려진 한계).
--
-- 해시는 고정 64자(HMAC-SHA256 hex)라 CHAR가 저장 효율상 더 적절하지만, 검증 실패를 감수할 만한
-- 이점은 아니라고 판단해 VARCHAR로 통일한다 — 엔티티 매핑이 이미 그렇게 가정하고 있었으므로.

ALTER TABLE business_entity MODIFY COLUMN business_number_search_hash VARCHAR(64) NULL;
ALTER TABLE store MODIFY COLUMN business_number_search_hash VARCHAR(64) NULL;
ALTER TABLE `user` MODIFY COLUMN phone_search_hash VARCHAR(64) NULL;

-- V43이 store.business_number_pepper_version을 SMALLINT로 만들었지만 엔티티는 평범한
-- `Integer businessNumberPepperVersion` 매핑이라 Hibernate가 INTEGER를 기대한다 — 같은 종류의
-- 발견(위와 동일 세션, 같은 원인: ddl-auto=update가 지금까지 이 불일치를 가려왔음).
ALTER TABLE store MODIFY COLUMN business_number_pepper_version INTEGER NULL;
