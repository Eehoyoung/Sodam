-- Phase 0 PII 핫픽스(DB_OPTIMIZATION_PLAN.md §-1, §2.6): store.business_number 암호화 전환에 맞춰
-- 블라인드 인덱스(HMAC) 컬럼을 함께 추가한다. 반드시 애플리케이션의 암호화 적용과 동시 배포 —
-- 순서 분리 시 그 사이 기간에 사업자등록번호 중복 가입 방지 기능이 깨진다(§-1 참조).
--
-- 기존 로우는 business_number_search_hash 가 NULL 인 상태로 남는다(운영 DB 백필 배치는 Phase 6에서
-- 수행, §2.6.5). NULL 은 InnoDB UNIQUE 인덱스에서 서로 다른 값으로 취급되므로, 백필 전에도
-- 기존 로우끼리 유니크 제약 위반은 발생하지 않는다.

ALTER TABLE store
    ADD COLUMN business_number_search_hash CHAR(64) NULL,
    ADD COLUMN business_number_pepper_version SMALLINT NULL;

CREATE UNIQUE INDEX uq_store_business_number_search_hash ON store (business_number_search_hash);
