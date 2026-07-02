-- 사장 승인 출퇴근 요청 (위치/NFC 없이 사장 승인으로 출퇴근).
-- 직원 요청 시점(requested_time)이 실제 출퇴근 시각이 되고, 사장 승인 시 그 시각으로 Attendance 기록.

CREATE TABLE attendance_approval_request (
    aar_id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id          BIGINT NOT NULL,
    store_id             BIGINT NOT NULL,
    type                 VARCHAR(10) NOT NULL,        -- CHECK_IN / CHECK_OUT
    requested_time       DATETIME(6) NOT NULL,
    status               VARCHAR(10) NOT NULL,        -- PENDING / APPROVED / REJECTED
    result_attendance_id BIGINT NULL,
    reject_reason        VARCHAR(200) NULL,
    requested_at         DATETIME(6) NOT NULL,
    decided_at           DATETIME(6) NULL,
    INDEX idx_aar_store_status (store_id, status),
    INDEX idx_aar_employee (employee_id),
    INDEX idx_aar_requested_at (requested_at)
);
