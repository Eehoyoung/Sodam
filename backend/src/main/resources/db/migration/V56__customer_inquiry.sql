-- Q&A 화면 1:1 문의 저장 (findings_report.md §1-3 — 기존에는 FE가 저장 API를 호출하지 않고
-- 성공 토스트만 띄우던 상태였다). 공개 팁/FAQ 콘텐츠(qna_info)와는 별개 테이블로 분리.
CREATE TABLE customer_inquiry (
    customer_inquiry_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requester_user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_customer_inquiry_user FOREIGN KEY (requester_user_id) REFERENCES `user` (user_id)
);

CREATE INDEX idx_customer_inquiry_requester ON customer_inquiry (requester_user_id);
CREATE INDEX idx_customer_inquiry_created_at ON customer_inquiry (created_at);
