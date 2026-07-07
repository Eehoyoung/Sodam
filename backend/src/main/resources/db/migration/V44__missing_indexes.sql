-- Phase 1(DB_OPTIMIZATION_PLAN.md §2.1, §2.12): 사장/직원 목록·대시보드 조회에서 풀스캔이 발생하는
-- 참조 컬럼에 인덱스 추가 + 카디널리티 미강제 지점 2건에 UNIQUE 제약 추가.
-- FK 제약은 추가하지 않음(§2.2 — 별도 정책, Phase 6에서 처리).
--
-- 번호 정정: 원래 초안(§4)은 이 마이그레이션을 V43으로 잡았으나, Phase 0(PII 핫픽스)이 V43을
-- 먼저 사용해 V44로 적용한다.

CREATE INDEX idx_labor_contract_store_id ON labor_contract (store_id);
CREATE INDEX idx_employee_document_store_id ON employee_document (store_id);
CREATE INDEX idx_payroll_bonus_store_id ON payroll_bonus (store_id);
CREATE INDEX idx_attendance_irregularity_store_id ON attendance_irregularity (store_id);
CREATE INDEX idx_attendance_irregularity_attendance_id ON attendance_irregularity (attendance_id);
CREATE INDEX idx_attendance_irregularity_work_shift_id ON attendance_irregularity (work_shift_id);
CREATE INDEX idx_attendance_notice_store_id ON attendance_notice (store_id);
CREATE INDEX idx_shift_template_entry_employee_id ON shift_template_entry (employee_id);
CREATE INDEX idx_shift_swap_applicant_employee_id ON shift_swap_applicant (employee_id);
CREATE INDEX idx_shift_swap_request_original_employee_id ON shift_swap_request (original_employee_id);
CREATE INDEX idx_shift_swap_request_approved_employee_id ON shift_swap_request (approved_employee_id);

-- §2.12 카디널리티 미강제 지점 — 운영 적용 전 반드시 기존 데이터 중복 스캔 선행:
--   SELECT master_id, store_id, COUNT(*) FROM master_store_relation GROUP BY master_id, store_id HAVING COUNT(*) > 1;
--   SELECT referee_user_id, COUNT(*) FROM referral GROUP BY referee_user_id HAVING COUNT(*) > 1;
-- (이 세션에서는 로컬 docker MySQL 이 기동돼 있지 않아 실측 스캔을 수행하지 못했다 — 운영 적용 전 필수 확인.)
CREATE UNIQUE INDEX uq_master_store_relation ON master_store_relation (master_id, store_id);

-- referral.referee_user_id 는 V1__baseline.sql 이 이미 비유니크 idx_referral_referee 를 만들어뒀다 —
-- 같은 이름으로 유니크 재생성하려면 먼저 drop 해야 한다(엔티티 @Index(unique=true) 도 동일 이름 유지).
DROP INDEX idx_referral_referee ON referral;
CREATE UNIQUE INDEX idx_referral_referee ON referral (referee_user_id);

-- payroll(employee_id, store_id, start_date, end_date) UNIQUE 는 여기 포함하지 않음 — Payroll.startDate/
-- endDate가 nullable이고, 배치가 아직 단일 대형 트랜잭션이라 Phase 5(트랜잭션 분할) 완료 후에 추가.
-- employee_store_relation(employee_id, store_id, is_active) 부분 유니크는 SQL 제약만으로 불가능 —
-- Phase 2의 Redis 분산 락으로 애플리케이션 레벨에서 직렬화(§2.12 참조).
-- subscription(user_id, status='ACTIVE') 부분 유니크는 Phase 6에서 생성 컬럼 방식으로 처리.
