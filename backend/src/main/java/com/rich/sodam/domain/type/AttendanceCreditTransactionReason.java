package com.rich.sodam.domain.type;

/**
 * 출근권 거래 원장의 세부 사유(§2 recruitment-monetization-gamification-plan.md §2.2·§2.3·§2.4).
 */
public enum AttendanceCreditTransactionReason {
    /** 사장 일일 출석체크 지급(월~목 3개, 금~일 5개). */
    DAILY_CHECK_IN,
    /** 7일 연속 출석 달성 보너스(+10, 즉시 지급). */
    STREAK_BONUS,
    /** 사장 → 구직자 채용 제안 발송(-1). */
    OFFER_SEND,
    /** 사장 → 지원서 열람 + 채팅방 개설(-2, 1회 행동으로 묶임). */
    APPLICATION_VIEW_CHAT_OPEN,
    /** 유료 IAP 충전 — Phase C 전까지 스키마만 보유(기능 미배선). */
    IAP_TOPUP,
    /** 스트릭 복구권 사용 — Phase C 전까지 스키마만 보유(기능 미배선). */
    STREAK_RECOVERY,
    /** 환불. */
    REFUND
}
