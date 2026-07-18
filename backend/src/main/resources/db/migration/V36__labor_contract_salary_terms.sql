-- 월급/연봉제 근로계약의 임금 구조를 정식 컬럼으로 보관한다.
-- 기존 시급제 계약은 pay_type=HOURLY 로 유지한다.

ALTER TABLE labor_contract
    ADD COLUMN pay_type VARCHAR(20) NOT NULL DEFAULT 'HOURLY' COMMENT '임금 유형(HOURLY/SALARY)',
    ADD COLUMN salary_pay_unit VARCHAR(20) NULL COMMENT '월급제 급여 입력 단위(MONTHLY/ANNUAL)',
    ADD COLUMN monthly_base_salary INT NULL COMMENT '월 기본급 또는 연봉 월 환산액(주휴 포함)',
    ADD COLUMN annual_salary INT NULL COMMENT '연봉 금액 또는 월급 연 환산액',
    ADD COLUMN ordinary_hourly_wage INT NULL COMMENT '월급/연봉 환산 통상시급',
    ADD COLUMN fixed_overtime_hours_per_month DOUBLE NULL COMMENT '월 고정 연장근로 약정시간',
    ADD COLUMN fixed_overtime_pay INT NULL COMMENT '월 고정 연장수당',
    ADD COLUMN fixed_night_hours_per_month DOUBLE NULL COMMENT '월 고정 야간근로 약정시간',
    ADD COLUMN fixed_night_pay INT NULL COMMENT '월 고정 야간가산수당',
    ADD COLUMN fixed_holiday_hours_within_8_per_month DOUBLE NULL COMMENT '월 고정 휴일근로 약정시간(1일 8시간 이내)',
    ADD COLUMN fixed_holiday_hours_over_8_per_month DOUBLE NULL COMMENT '월 고정 휴일근로 약정시간(1일 8시간 초과분)',
    ADD COLUMN fixed_holiday_pay INT NULL COMMENT '월 고정 휴일근로수당',
    ADD COLUMN expected_monthly_wage INT NULL COMMENT '예상 월 지급액',
    ADD COLUMN five_or_more_employees_snapshot BOOLEAN NULL COMMENT '계약 작성 시점 상시근로자 5인 이상 여부';
