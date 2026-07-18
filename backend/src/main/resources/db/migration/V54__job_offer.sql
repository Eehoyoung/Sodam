-- 채용 제안(JobOffer) — 사장→구직자 인앱 제안 (260711_작업통합.md Part 2 §15.2, Phase 5)
--
-- 동시 중복 PENDING 방지(§10 Phase 5 동시성 리스크 1): MySQL은 부분(조건부) UNIQUE 인덱스를 지원하지
-- 않으므로 생성 컬럼(GENERATED ALWAYS AS ... VIRTUAL) 트릭을 사용한다. pending_dedup_key는
-- status='PENDING'일 때만 "{store_id}_{target_user_id}" 값을 갖고, 그 외 상태는 NULL이다.
-- MySQL의 UNIQUE 인덱스는 NULL 값을 여러 개 허용하므로 PENDING이 아닌 행끼리는 충돌하지 않고,
-- 같은 매장→같은 구직자에게 PENDING 제안이 동시에 2건 생성되는 레이스만 DB 레벨에서 차단된다.
CREATE TABLE job_offer (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL,
    work_type VARCHAR(20) NOT NULL,
    work_date DATE NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hourly_wage INT NOT NULL,
    message VARCHAR(200) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    responded_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    pending_dedup_key VARCHAR(40) GENERATED ALWAYS AS (
        CASE WHEN status = 'PENDING' THEN CONCAT(store_id, '_', target_user_id) ELSE NULL END
    ) VIRTUAL,
    CONSTRAINT fk_job_offer_store FOREIGN KEY (store_id) REFERENCES store (store_id),
    CONSTRAINT fk_job_offer_target_user FOREIGN KEY (target_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_job_offer_pending UNIQUE (pending_dedup_key)
);

CREATE INDEX idx_job_offer_target_status ON job_offer (target_user_id, status);
CREATE INDEX idx_job_offer_store_status ON job_offer (store_id, status);
