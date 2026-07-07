package com.rich.sodam.domain.type;

/**
 * 근태 이상 유형 — 예정(WorkShift) 대비 실제(Attendance) 차이.
 */
public enum AttendanceIrregularityType {
    /** 지각 — 예정 시작시각보다 늦게 출근. */
    LATE,
    /** 조퇴 — 예정 종료시각보다 일찍 퇴근. */
    EARLY_LEAVE,
    /** 결근 — 예정 시프트가 있는데 출근 기록 자체가 없음(승인된 휴가 제외). */
    ABSENCE
}
