package com.rich.sodam.domain.type;

/**
 * 직원의 사전 신고 유형. 사장에게 알리는 용도일 뿐 임금 계산에는 영향을 주지 않는다
 * (실제 처리는 사후에 AttendanceIrregularity 확정 단계에서 이루어진다).
 */
public enum AttendanceNoticeType {
    LATE_EXPECTED,
    EARLY_LEAVE_EXPECTED,
    ABSENCE_EXPECTED
}
