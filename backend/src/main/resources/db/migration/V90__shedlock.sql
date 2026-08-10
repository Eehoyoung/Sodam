-- SV-07: 스케줄러 다중 인스턴스 중복 실행 차단(ShedLock).
-- 인스턴스를 2대 이상으로 늘리면 정기결제(BillingScheduler)·월 급여 계산
-- (PayrollMonthlyBatchScheduler)이 동시에 두 번 도는 것을 이 락이 막는다.
--
-- ⚠️ 계획서(docs/260809/260809_서버비_코드작업_계획서.md §0.1)는 이 테이블을 V82 로 예약했으나,
--    그 사이 V83~V89 가 먼저 적용돼 뒤늦게 V82 를 넣으면 Flyway(out-of-order 미설정)가
--    건너뛴다. 그래서 V90 으로 번호를 옮겼다. V82·V84 는 영구 결번이다.
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until TIMESTAMP(3) NOT NULL,
    locked_at  TIMESTAMP(3) NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
