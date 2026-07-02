-- 근무 시프트 템플릿 (B10 후속): 매장별 주간 근무 패턴 저장 → 재적용.
-- 확정 설계: 저장범위=주간패턴(직원 포함), 공유단위=매장별, 직원결합=직원 고정.

CREATE TABLE shift_template (
    shift_template_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id             BIGINT NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    created_by_master_id BIGINT NULL,
    created_at           DATETIME(6) NOT NULL,
    INDEX idx_shift_template_store (store_id)
);

CREATE TABLE shift_template_entry (
    shift_template_entry_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shift_template_id       BIGINT NOT NULL,
    employee_id             BIGINT NOT NULL,
    day_of_week             VARCHAR(10) NOT NULL,
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    memo                    VARCHAR(200) NULL,
    INDEX idx_ste_template (shift_template_id),
    CONSTRAINT fk_ste_template FOREIGN KEY (shift_template_id)
        REFERENCES shift_template (shift_template_id) ON DELETE CASCADE
);
