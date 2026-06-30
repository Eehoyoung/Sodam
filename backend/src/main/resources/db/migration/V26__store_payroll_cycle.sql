-- 매장 급여 정산 주기(시작/마감/지급일) — 사장이 매장 생성/수정 시 지정.
-- offset 은 MonthOffset enum(PREV_MONTH/CURRENT_MONTH/NEXT_MONTH) 문자열.
-- day 는 '01'~'31' 2자리 문자열(1자리 입력은 FE/도메인에서 0 패딩). 말일이면 day=NULL + last_day=1.
-- 전체 NULL 허용 — 기존/미설정 매장 호환.
ALTER TABLE `store`
    ADD COLUMN `pay_period_start_offset`  VARCHAR(16) NULL,
    ADD COLUMN `pay_period_start_day`     VARCHAR(2)  NULL,
    ADD COLUMN `pay_period_end_offset`    VARCHAR(16) NULL,
    ADD COLUMN `pay_period_end_day`       VARCHAR(2)  NULL,
    ADD COLUMN `pay_period_end_last_day`  BIT         NULL,
    ADD COLUMN `pay_day_offset`           VARCHAR(16) NULL,
    ADD COLUMN `pay_day_day`              VARCHAR(2)  NULL,
    ADD COLUMN `pay_day_last_day`         BIT         NULL;
