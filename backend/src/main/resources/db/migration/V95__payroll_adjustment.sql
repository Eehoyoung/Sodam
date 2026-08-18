-- 260818 감사 C-3: 급여 가감조정(정산 마법사에서 사장이 넣는 ±금액)을 서버에 보존한다.
--
-- 이전에는 화면에서만 더해 보여주고 서버로 전송되지 않아, 사장이 본 총액과 실제 확정 급여가
-- 달랐다(임금체불·과다지급 분쟁 소지). 발급(PUT /api/payroll/{id}/issue) 요청바디로 함께 전달된다.
--
-- 과세 처리: 세후 가산(2026-08-18 사용자 확정). netWage = grossWage - (taxAmount + deductions) + adjustment
-- 이므로 grossWage/taxAmount/4대보험·주휴수당 계산에는 영향이 없다.

ALTER TABLE payroll
    ADD COLUMN adjustment INT NULL COMMENT '가감조정액(원, 세후 가산. 음수=차감)',
    ADD COLUMN adjustment_reason VARCHAR(200) NULL COMMENT '가감조정 사유';
