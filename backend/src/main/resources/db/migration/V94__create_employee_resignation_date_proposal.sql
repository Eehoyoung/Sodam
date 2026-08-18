-- 260817 퇴사 처리 기능 계획서 WP-3: 퇴사일 조율(왕복 협의) — append-only 제안 이력.
--
-- 수정·삭제 없음(3차 정정 — 최초 설계는 필드 덮어쓰기였는데, 이 코드베이스의 다른 의사결정
-- 이력(전자서명 증적·매니저위임 감사)이 전부 append-only인 것과 맞춰 이력을 남기는 모델로
-- 바꿨다). proposed_date는 데이터 캡처 전용이다(HC-1/HC-8) — 급여·보존기간 로직에서 참조하지 않는다.

CREATE TABLE employee_resignation_date_proposal (
    id BIGINT NOT NULL AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    proposer_role VARCHAR(20) NOT NULL,
    proposed_date DATE NOT NULL,
    proposed_at DATETIME NOT NULL,
    accepted BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_resignation_proposal_request (request_id)
);
