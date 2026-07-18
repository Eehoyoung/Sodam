-- 휴가 신청 유형/단위 확장: 연차·무급·기타 구분, 반차·시간 단위 신청, 거부 사유.
-- 기본값은 기존 데이터 호환을 위해 leave_type=ANNUAL, unit=FULL_DAY (기존 동작 그대로 보존).
-- unit=HALF_DAY/HOURS 는 근로기준법이 아닌 매장 자체 정책(노사 합의) — 법정 시간 단위 연차
-- (개정 근로기준법)는 2027-06-10 시행 예정으로 2026-07 현재 시행령 미확정.
ALTER TABLE `time_off`
    ADD COLUMN `leave_type`    VARCHAR(20)  NOT NULL DEFAULT 'ANNUAL' COMMENT '휴가 유형(ANNUAL/UNPAID/OTHER)',
    ADD COLUMN `unit`          VARCHAR(20)  NOT NULL DEFAULT 'FULL_DAY' COMMENT '신청 단위(FULL_DAY/HALF_DAY/HOURS)',
    ADD COLUMN `start_time`    TIME(6)      NULL COMMENT '시간단위(unit=HOURS) 신청 시작 시각',
    ADD COLUMN `end_time`      TIME(6)      NULL COMMENT '시간단위(unit=HOURS) 신청 종료 시각',
    ADD COLUMN `reject_reason` VARCHAR(500) NULL COMMENT '거부 사유(§60⑤ 시기변경권 등 — 사장 거부 시 필수 입력 유도)';
