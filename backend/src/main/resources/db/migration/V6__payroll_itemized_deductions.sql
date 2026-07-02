-- 임금명세서(근로기준법 §48②) 항목별 공제내역 저장용 컬럼.
-- 4대보험 정책(FOUR_INSURANCES)일 때 채워지며, 3.3% 원천징수 정책은 tax_amount(소득세)만 사용한다.
ALTER TABLE `payroll`
    ADD COLUMN `national_pension_deduction`     INT NULL,
    ADD COLUMN `health_insurance_deduction`     INT NULL,
    ADD COLUMN `long_term_care_deduction`       INT NULL,
    ADD COLUMN `employment_insurance_deduction` INT NULL;
