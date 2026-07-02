-- 휴일근로 가산(근로기준법 §56②) 지원: 출퇴근 휴일 플래그 + 급여 휴일근로 항목.
ALTER TABLE `attendance`
    ADD COLUMN `holiday_work` BIT NOT NULL DEFAULT 0;

ALTER TABLE `payroll`
    ADD COLUMN `holiday_work_hours` DOUBLE NULL,
    ADD COLUMN `holiday_work_wage`  INT    NULL;

ALTER TABLE `payroll_detail`
    ADD COLUMN `holiday_work_hours` DOUBLE NULL,
    ADD COLUMN `holiday_work_wage`  INT    NULL,
    ADD COLUMN `holiday_work`       BIT    NOT NULL DEFAULT 0;
