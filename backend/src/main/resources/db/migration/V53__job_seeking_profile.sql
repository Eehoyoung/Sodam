-- 인증채용(구직·구인) 구직 프로필 (260711_작업통합.md Part 2 §3.2)
-- User 1:1 — 퇴사자도 과거 출퇴근 이력만 있으면 구직 가능해야 하므로 EmployeeProfile이 아닌 User 기준.
-- 계획서 작성 시점 최신은 V51(business_entity)이었으나, 커밋 시점에 V52가 이미 선점되어 있어
-- (V52__fix_search_hash_column_types.sql) SQL 내용 변경 없이 번호만 V53으로 조정했다.
CREATE TABLE job_seeking_profile (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    seeking BOOLEAN NOT NULL DEFAULT FALSE,
    location1_address VARCHAR(255) NULL,
    location1_latitude DOUBLE NULL,
    location1_longitude DOUBLE NULL,
    location2_address VARCHAR(255) NULL,
    location2_latitude DOUBLE NULL,
    location2_longitude DOUBLE NULL,
    seeking_types VARCHAR(50) NULL,
    job_categories VARCHAR(100) NULL,
    availability_json VARCHAR(2000) NULL,
    instant_available BOOLEAN NOT NULL DEFAULT FALSE,
    instant_available_set_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT uq_job_seeking_user UNIQUE (user_id),
    CONSTRAINT fk_job_seeking_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
);
CREATE INDEX idx_job_seeking_seeking ON job_seeking_profile (seeking);
