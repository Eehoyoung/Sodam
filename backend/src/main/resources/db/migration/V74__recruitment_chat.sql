-- 인증채용 채팅 + 최소 안전장치(신고/차단)
-- (recruitment-monetization-gamification-plan.md §4, Phase D)
--
-- chat_room: 채용 매칭(JobOffer 수락 / JobApplication 응답) 1건당 1개. (source_type, source_id)
--   유니크로 매칭당 채팅방 1개를 DB 레벨에서 보장한다(ChatRoomService 이중 방어의 뒷단).
-- chat_message: 텍스트 전용(v1). content 컬럼에는 PII 마스킹이 끝난 결과만 저장한다 — 원문은
--   어디에도 보관하지 않는다(ChatMessageMasker). 시스템 메시지는 sender_user_id가 NULL이다.
-- chat_message_report: 메시지 단위 신고. (message_id, reporter_user_id) 유니크로 중복 신고 방지.
-- chat_user_restriction: 신고 누적 임계치 도달 시 발신 제한 플래그(운영 검토 대기, 자동 영구정지 아님).
-- user_block: 상호 비노출(리스트·제안·채팅 전 구간)에 재사용되는 단방향 차단 기록.

CREATE TABLE chat_room (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    master_user_id BIGINT NOT NULL,
    counterpart_user_id BIGINT NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    source_id BIGINT NOT NULL,
    work_type VARCHAR(20) NOT NULL,
    work_date DATE NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hourly_wage INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    matched_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_chat_room_store FOREIGN KEY (store_id) REFERENCES store (store_id),
    CONSTRAINT fk_chat_room_master FOREIGN KEY (master_user_id) REFERENCES `user` (user_id),
    CONSTRAINT fk_chat_room_counterpart FOREIGN KEY (counterpart_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_chat_room_source UNIQUE (source_type, source_id)
);

CREATE INDEX idx_chat_room_master ON chat_room (master_user_id);
CREATE INDEX idx_chat_room_counterpart ON chat_room (counterpart_user_id);

CREATE TABLE chat_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    chat_room_id BIGINT NOT NULL,
    sender_user_id BIGINT NULL,
    message_type VARCHAR(20) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    masked BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME NOT NULL,
    read_at DATETIME NULL,
    CONSTRAINT fk_chat_message_room FOREIGN KEY (chat_room_id) REFERENCES chat_room (id),
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_user_id) REFERENCES `user` (user_id)
);

CREATE INDEX idx_chat_message_room_sent ON chat_message (chat_room_id, sent_at);

CREATE TABLE chat_message_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    reporter_user_id BIGINT NOT NULL,
    reason VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_chat_message_report_message FOREIGN KEY (message_id) REFERENCES chat_message (id),
    CONSTRAINT fk_chat_message_report_reporter FOREIGN KEY (reporter_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_chat_message_report UNIQUE (message_id, reporter_user_id)
);

CREATE TABLE chat_user_restriction (
    user_id BIGINT PRIMARY KEY,
    restricted_at DATETIME NOT NULL,
    report_count INT NOT NULL,
    CONSTRAINT fk_chat_user_restriction_user FOREIGN KEY (user_id) REFERENCES `user` (user_id)
);

CREATE TABLE user_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    blocker_user_id BIGINT NOT NULL,
    blocked_user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_user_block_blocker FOREIGN KEY (blocker_user_id) REFERENCES `user` (user_id),
    CONSTRAINT fk_user_block_blocked FOREIGN KEY (blocked_user_id) REFERENCES `user` (user_id),
    CONSTRAINT uq_user_block UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX idx_user_block_blocked ON user_block (blocked_user_id);
