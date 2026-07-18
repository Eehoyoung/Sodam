-- Phase 5(DB_OPTIMIZATION_PLAN.md §2.8(e), §2.12): payroll(employee_id, store_id, start_date, end_date)
-- UNIQUE는 Phase 1에서 두 가지 이유로 이연됐다 — ① start_date/end_date가 nullable이라 NULL을 서로
-- 다른 값으로 취급하는 MySQL UNIQUE 인덱스 특성상 제약이 조용히 무력화될 수 있었고, ② 급여 배치가
-- 아직 단일 대형 트랜잭션이라 위반이 flush 시점까지 지연돼 엉뚱한 반복에서 터지거나 배치 전체가
-- 롤백될 위험이 있었다. Phase 5(배치를 직원 단위 REQUIRES_NEW 트랜잭션으로 분할)가 끝나 두 이유 모두
-- 해소됐다 — 코드 전수 확인 결과 Payroll 엔티티 생성 지점은 PayrollService.calculatePayroll() 단
-- 한 곳뿐이고 그 자리에서 항상 startDate/endDate를 채우므로(널 남기는 경로 없음) NOT NULL 전환도 함께
-- 적용한다.
--
-- ⚠️ 운영 적용 전 필수: 기존 데이터에 NULL 또는 중복 조합이 있으면 아래 두 ALTER 모두 실패한다(안전한
-- 실패 모드 — 조용히 깨지지 않음). 먼저 다음 스캔을 실행할 것:
--   SELECT COUNT(*) FROM payroll WHERE start_date IS NULL OR end_date IS NULL;
--   SELECT employee_id, store_id, start_date, end_date, COUNT(*) FROM payroll
--     GROUP BY employee_id, store_id, start_date, end_date HAVING COUNT(*) > 1;
-- (이 세션은 로컬 MySQL이 방금 초기화된 빈 볼륨이라 실측 스캔을 수행하지 못했다.)

ALTER TABLE payroll
    MODIFY COLUMN start_date DATE NOT NULL,
    MODIFY COLUMN end_date DATE NOT NULL;

CREATE UNIQUE INDEX uq_payroll_employee_store_period ON payroll (employee_id, store_id, start_date, end_date);
