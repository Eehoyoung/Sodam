CREATE TABLE payment_refund_request (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_type VARCHAR(40) NOT NULL,
    source_order_id VARCHAR(80) NOT NULL,
    owner_user_id BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    amount_krw INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(300) NULL,
    created_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_payment_refund_source UNIQUE (source_type, source_order_id),
    INDEX idx_payment_refund_owner (owner_user_id),
    INDEX idx_payment_refund_source (source_type, source_order_id)
);
