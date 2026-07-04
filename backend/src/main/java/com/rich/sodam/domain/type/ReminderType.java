package com.rich.sodam.domain.type;

/**
 * 사장 리마인더 배치 유형 ({@link com.rich.sodam.service.OwnerReminderScheduler}).
 */
public enum ReminderType {
    /** 마감 30분 전 — 오늘 매출 입력 알림. */
    SALES_CLOSE_REMINDER,
    /** 다음날 오픈 후 — 어제 매출 미입력 재알림. */
    SALES_YESTERDAY_REMINDER,
    /** 급여일 D-3 알림. */
    PAYDAY_D3,
    /** 주간 리포트(월요일 오전) 알림. */
    WEEKLY_REPORT,
    /** 지각·미출근 감지 — 시프트 시작 +10분 경과에도 출근 기록 없음(ref_id = work_shift_id). */
    SHIFT_LATE
}
