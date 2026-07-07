package com.rich.sodam.domain.type;

/**
 * 휴가 신청 유형.
 *
 * <p>{@link #ANNUAL}만 연차유급휴가(근로기준법 §60) 잔여 풀에서 차감된다.
 * {@link #UNPAID}(무급휴가)·{@link #OTHER}(경조사 등 기타)는 연차 잔여와 무관하다.</p>
 */
public enum TimeOffLeaveType {
    /** 연차유급휴가(§60) — 잔여 연차 검증·차감 대상. */
    ANNUAL,
    /** 무급휴가 — 연차 잔여와 무관. */
    UNPAID,
    /** 기타(경조사 등) — 연차 잔여와 무관. */
    OTHER
}
