-- 구인 공고(JobPosting) & 직원 지원(JobApplication) (260711_작업통합.md Part 2 §19.2, Phase 5)
--
-- job_posting: 매장당 활성 공고 1건(v1 단순화) — store_id 단순 UNIQUE로 충분하다. 상태 무관 제약이라
-- job_offer/job_application과 달리 생성 컬럼 트릭이 필요 없다(§10 Phase 5 동시성 리스크 2 — upsert의
-- find-then-decide 레이스는 이 UNIQUE 제약이 최종 방어선이 되고, "이미 존재" 예외 처리/재시도는
-- 서비스 레이어 책임).
CREATE TABLE job_posting (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    work_type VARCHAR(20) NOT NULL,
    job_category VARCHAR(30) NOT NULL,
    work_date DATE NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hourly_wage INT NOT NULL,
    message VARCHAR(200) NULL,
    `open` BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT uq_job_posting_store UNIQUE (store_id),
    CONSTRAINT fk_job_posting_store FOREIGN KEY (store_id) REFERENCES store (store_id)
);

CREATE INDEX idx_job_posting_open ON job_posting (`open`);

-- job_application: 같은 공고→같은 지원자 PENDING 1건 — job_offer(V54)와 동일한 생성 컬럼 트릭
-- (§10 Phase 5 동시성 리스크 3).
CREATE TABLE job_application (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    posting_id BIGINT NOT NULL,
    applicant_user_id BIGINT NOT NULL,
    message VARCHAR(200) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    responded_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    pending_dedup_key VARCHAR(40) GENERATED ALWAYS AS (
        CASE WHEN status = 'PENDING' THEN CONCAT(posting_id, '_', applicant_user_id) ELSE NULL END
    ) VIRTUAL,
    CONSTRAINT fk_job_application_posting FOREIGN KEY (posting_id) REFERENCES job_posting (id),
    CONSTRAINT fk_job_application_applicant FOREIGN KEY (applicant_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_job_application_pending UNIQUE (pending_dedup_key)
);

CREATE INDEX idx_job_application_posting_status ON job_application (posting_id, status);
CREATE INDEX idx_job_application_applicant_status ON job_application (applicant_user_id, status);
