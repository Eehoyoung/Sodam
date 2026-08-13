ALTER TABLE store
    ADD COLUMN weekly_allowance_week_start_day VARCHAR(16) NULL;

ALTER TABLE payroll_policy
    ADD COLUMN weekly_allowance_for_income_tax3_3_enabled BOOLEAN NOT NULL DEFAULT TRUE;
