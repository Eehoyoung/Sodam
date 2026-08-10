-- 주 40시간 초과 연장가산(§56①)을 급여에 별도 항목으로 보관한다.
-- 금액과 함께 시간 수를 두는 이유: 시행령 §27조의2 는 연장근로에 대해 "그 시간 수"를
-- 임금명세서에 적도록 요구하며, 정액 수당이 아닌 변동 항목에는 예외가 없다.
-- 주휴수당도 같은 이유로 환산 시간을 함께 보관한다. "정액 수당" 예외 해당 여부가
-- 확정되지 않아(RELEASE_GATES G-9 각주) 안전한 쪽을 택한다.
ALTER TABLE payroll
    ADD COLUMN weekly_overtime_hours DOUBLE NULL,
    ADD COLUMN weekly_overtime_wage INT NULL,
    ADD COLUMN weekly_allowance_hours DOUBLE NULL;
