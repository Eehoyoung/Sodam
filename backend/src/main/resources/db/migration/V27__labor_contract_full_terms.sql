-- 근로계약서 필수 기재사항과 근로형태별 추가 정보를 저장한다.
-- 기존 계약 데이터와의 호환을 위해 신규 컬럼은 nullable 또는 기본값을 둔다.

ALTER TABLE labor_contract
    ADD COLUMN period_type VARCHAR(20) NOT NULL DEFAULT 'PERMANENT' COMMENT '계약기간 구분',

    ADD COLUMN work_start_time TIME NULL COMMENT '시업 시각',
    ADD COLUMN work_end_time   TIME NULL COMMENT '종업 시각',
    ADD COLUMN break_minutes   INT NULL COMMENT '휴게시간(분)',

    ADD COLUMN mon_hours DOUBLE NULL COMMENT '월요일 근로시간',
    ADD COLUMN tue_hours DOUBLE NULL COMMENT '화요일 근로시간',
    ADD COLUMN wed_hours DOUBLE NULL COMMENT '수요일 근로시간',
    ADD COLUMN thu_hours DOUBLE NULL COMMENT '목요일 근로시간',
    ADD COLUMN fri_hours DOUBLE NULL COMMENT '금요일 근로시간',
    ADD COLUMN sat_hours DOUBLE NULL COMMENT '토요일 근로시간',
    ADD COLUMN sun_hours DOUBLE NULL COMMENT '일요일 근로시간',

    ADD COLUMN is_probation        BOOLEAN NOT NULL DEFAULT FALSE COMMENT '수습 적용 여부',
    ADD COLUMN probation_months    INT NULL COMMENT '수습기간(개월)',
    ADD COLUMN probation_wage_rate DOUBLE NULL COMMENT '수습 중 임금 비율',

    ADD COLUMN employment_insurance              BOOLEAN NOT NULL DEFAULT TRUE COMMENT '고용보험 적용',
    ADD COLUMN industrial_accident_insurance     BOOLEAN NOT NULL DEFAULT TRUE COMMENT '산재보험 적용',
    ADD COLUMN national_pension                  BOOLEAN NOT NULL DEFAULT TRUE COMMENT '국민연금 적용',
    ADD COLUMN health_insurance                  BOOLEAN NOT NULL DEFAULT TRUE COMMENT '건강보험 적용',

    ADD COLUMN employee_signature_image TEXT NULL COMMENT '직원 서명 이미지';
