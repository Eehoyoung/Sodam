package com.rich.sodam.domain.type;

/**
 * 근태 이상 처리 상태 — 사장이 확정하기 전까지는 급여에 영향을 주지 않는다.
 */
public enum AttendanceIrregularityResolution {
    /** 아직 사장이 확인·처리하지 않음. */
    PENDING,
    /** 사장이 사유를 확인하고 공제하지 않기로 함. */
    WAIVED,
    /** 통상시급 기준으로 공제 확정. */
    DEDUCTED,
    /** 연차(반차/종일)로 소급 전환 — 무급공제 대신 연차 차감. */
    CONVERTED_TO_LEAVE
}
