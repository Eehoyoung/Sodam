-- The composite indexes retain the leftmost-prefix access paths for these queries.
DROP INDEX idx_attendance_employee_id ON attendance;
DROP INDEX idx_attendance_check_in_time ON attendance;
