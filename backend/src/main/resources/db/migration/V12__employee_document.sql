-- 직원 서류함 (A5/M-NEW-01). 보건증 등 보관 + 만료 경보.
-- PII 미저장 — 원본 파일·주민번호·계좌 없음. file_ref(참조키)·만료 메타만.
CREATE TABLE `employee_document` (
    `employee_document_id` BIGINT       NOT NULL AUTO_INCREMENT,
    `employee_id`          BIGINT       NOT NULL,
    `store_id`             BIGINT       NOT NULL,
    `type`                 VARCHAR(30)  NOT NULL,
    `title`                VARCHAR(100) NOT NULL,
    `file_ref`             VARCHAR(300) NULL,
    `issued_at`            DATE         NULL,
    `expires_at`           DATE         NULL,
    `created_at`           DATETIME(6)  NOT NULL,
    PRIMARY KEY (`employee_document_id`),
    KEY `idx_emp_doc_emp_store` (`employee_id`, `store_id`),
    KEY `idx_emp_doc_expires` (`expires_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
