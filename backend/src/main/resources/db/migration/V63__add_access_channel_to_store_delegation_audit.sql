-- 사장님 웹 콘솔(Phase 0) — 감사로그 접근 채널 구분
-- docs/260726/04_보안정책.md §8, docs/260726/06_DB_마이그레이션계획.md §2.2
-- 기존 행(모바일 전용 기록)은 전부 MOBILE 로 채워진다(DEFAULT). 신규 웹 세션 경로 기록은
-- 애플리케이션 레벨에서 WEB 값을 명시적으로 전달한다(StoreDelegationAudit.AccessChannel).
ALTER TABLE store_delegation_audit ADD COLUMN access_channel VARCHAR(10) NOT NULL DEFAULT 'MOBILE';
