-- Phase 6(DB_OPTIMIZATION_PLAN.md §2.2(c)): 지금까지 employee_id/store_id 가 순수 Long 컬럼일 뿐
-- DB 레벨 FOREIGN KEY 자체가 없던 7개 테이블에 ON DELETE RESTRICT 로 새로 추가한다.
-- (참고: labor_contract/employee_document/attendance_approval_request/attendance_irregularity/
--  break_record/work_shift/payroll_bonus 외의 나머지 — attendance/payroll/payroll_detail/
--  time_off/wage_history/tax_report_send_log/employment_type_change_log — 는 V1/V33/V34 에서
--  이미 FK가 걸려 있고, MySQL은 ON DELETE 절을 생략하면 기본값이 RESTRICT 와 동일하게 동작하므로
--  이번 마이그레이션 대상에서 제외한다.)
--
-- ⚠️ 운영 적용 전 필수: 이 7개 테이블 전부에 고아 로우(참조 대상이 이미 삭제/존재하지 않는 행)가
-- 있는지 먼저 스캔할 것 — 있으면 아래 ALTER TABLE 자체가 실패한다(로컬 개발 환경은 docker MySQL이
-- 기동돼 있지 않아 이 세션에서 실측 스캔을 수행하지 못했다. 스테이징에서 먼저 드라이런 필수).
--
--   SELECT lc.labor_contract_id FROM labor_contract lc
--     LEFT JOIN employee_profile ep ON lc.employee_id = ep.user_id WHERE ep.user_id IS NULL;
--   SELECT lc.labor_contract_id FROM labor_contract lc
--     LEFT JOIN store s ON lc.store_id = s.store_id WHERE s.store_id IS NULL;
--   (employee_document, attendance_approval_request, break_record, work_shift, payroll_bonus 도
--    동일 패턴으로 employee_id/store_id 각각 스캔)
--   SELECT ai.air_id FROM attendance_irregularity ai
--     LEFT JOIN work_shift ws ON ai.work_shift_id = ws.work_shift_id WHERE ws.work_shift_id IS NULL;
--   SELECT ai.air_id FROM attendance_irregularity ai
--     LEFT JOIN attendance a ON ai.attendance_id = a.attendance_id
--     WHERE ai.attendance_id IS NOT NULL AND a.attendance_id IS NULL;

ALTER TABLE labor_contract
    ADD CONSTRAINT fk_labor_contract_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_labor_contract_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;

ALTER TABLE employee_document
    ADD CONSTRAINT fk_employee_document_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_employee_document_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;

ALTER TABLE attendance_approval_request
    ADD CONSTRAINT fk_air_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_air_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;

ALTER TABLE attendance_irregularity
    ADD CONSTRAINT fk_ai_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ai_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ai_work_shift FOREIGN KEY (work_shift_id) REFERENCES work_shift (work_shift_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ai_attendance FOREIGN KEY (attendance_id) REFERENCES attendance (attendance_id) ON DELETE RESTRICT;

ALTER TABLE break_record
    ADD CONSTRAINT fk_break_record_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_break_record_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;

ALTER TABLE work_shift
    ADD CONSTRAINT fk_work_shift_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_work_shift_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;

ALTER TABLE payroll_bonus
    ADD CONSTRAINT fk_payroll_bonus_employee FOREIGN KEY (employee_id) REFERENCES employee_profile (user_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payroll_bonus_store FOREIGN KEY (store_id) REFERENCES store (store_id) ON DELETE RESTRICT;
