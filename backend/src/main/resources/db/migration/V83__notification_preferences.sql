CREATE TABLE notification_preference (
    user_id BIGINT NOT NULL,
    master_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    payroll_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    billing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_start VARCHAR(5) NOT NULL DEFAULT '22:00',
    quiet_end VARCHAR(5) NOT NULL DEFAULT '07:00',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_notification_preference_user
        FOREIGN KEY (user_id) REFERENCES `user` (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
