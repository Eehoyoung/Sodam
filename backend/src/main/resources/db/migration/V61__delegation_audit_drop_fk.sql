-- 위임 감사 이력(store_delegation_audit)의 FK 제거.
-- 이력은 근로관계 기록에 준해 3년 보존해야 하므로(개인정보 안전성 확보조치 기준 — 권한 부여·변경·말소 기록),
-- 원본 매장/직원 행의 생명주기와 독립적이어야 한다. FK가 있으면 향후 매장·프로필 하드 삭제(회원 탈퇴 정리 등)가
-- 이력 보존과 충돌한다. 엔티티(StoreDelegationAudit)는 처음부터 연관관계 없이 Long id만 저장하므로 코드 변경 없음.
ALTER TABLE `store_delegation_audit` DROP FOREIGN KEY `fk_delegation_audit_store`;
ALTER TABLE `store_delegation_audit` DROP FOREIGN KEY `fk_delegation_audit_employee`;
