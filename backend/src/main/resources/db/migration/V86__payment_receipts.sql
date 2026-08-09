CREATE TABLE payment_receipt (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_type VARCHAR(40) NOT NULL,
    source_order_id VARCHAR(80) NOT NULL,
    owner_user_id BIGINT NOT NULL,
    payment_key VARCHAR(200) NULL,
    amount_krw INT NOT NULL,
    document_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    issuer_reference VARCHAR(160) NULL,
    failure_reason VARCHAR(300) NULL,
    created_at DATETIME NOT NULL,
    issued_at DATETIME NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_payment_receipt_source UNIQUE (source_type, source_order_id),
    INDEX idx_payment_receipt_owner (owner_user_id),
    INDEX idx_payment_receipt_status (status)
);
