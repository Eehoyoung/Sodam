package com.rich.sodam.domain.type;

/**
 * 대타 모집({@link com.rich.sodam.domain.ShiftSwapRequest}) 상태.
 */
public enum SwapRequestStatus {
    /** 모집 중 — 직원 지원 가능. */
    OPEN,
    /** 사장이 대타를 승인해 시프트가 재배정됨. */
    FILLED,
    /** 사장이 모집을 취소함. */
    CANCELLED
}
