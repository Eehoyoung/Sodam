-- 월급제 근로계약 스케줄 기반 급여 자동 산출.
-- 요일별 근무 스케줄(출근·퇴근·휴게)과 급여 기준시급을 계약에 보관하고,
-- 서비스가 주 실근로/소정/연장/야간을 산출해 기존 월급제 컬럼
-- (monthly_base_salary, fixed_overtime_*, fixed_night_*, expected_monthly_wage)을 채운다.
-- 요일×4 시각 = 최대 28컬럼은 과도하므로 단일 JSON 컬럼으로 보관하고 구조 검증은 서비스에서 수행.
-- 기존 mon_hours~sun_hours 는 스케줄이 있으면 스케줄에서 유도해 채운다(스케줄 = 단일 소스).
ALTER TABLE `labor_contract`
    ADD COLUMN `work_schedule_json` VARCHAR(2000) NULL COMMENT '요일별 근무 스케줄 JSON 배열 [{day,startTime,endTime,breakStartTime,breakEndTime}]. NULL=스케줄 미사용(월급 직접 입력 모드)',
    ADD COLUMN `salary_base_hourly_wage` INT NULL COMMENT '스케줄 기반 월급 자동 산출의 기준시급(원). 스케줄 모드에서 필수·최저임금 이상';
