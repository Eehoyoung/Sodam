-- Phase 6(DB_OPTIMIZATION_PLAN.md §2.6): user.phone 은 이미 AES-256-GCM 암호화 중이라 동등검색이
-- 불가능하다. 현재 이 해시로 조회하는 기능은 없다(§5 확정 정책 — 향후 검색 기능 추가를 대비한 선제
-- 도입). User.completeProfile() 에서만 계산되므로, 그 이전에 가입된 기존 로우는 NULL로 남는다
-- (백필은 실제 사용 기능이 생길 때 함께 설계 — Store.businessNumber 처럼 즉시 유니크 제약을 걸어야
-- 하는 활성 방어 기능이 아니라서 Phase 0과 달리 백필 배치를 지금 강제하지 않는다).

ALTER TABLE user
    ADD COLUMN phone_search_hash CHAR(64) NULL;

CREATE INDEX idx_user_phone_search_hash ON user (phone_search_hash);
