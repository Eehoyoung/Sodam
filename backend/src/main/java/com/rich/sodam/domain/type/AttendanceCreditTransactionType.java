package com.rich.sodam.domain.type;

/**
 * 출근권 거래 원장의 큰 분류(§2 recruitment-monetization-gamification-plan.md).
 *
 * <p>{@link AttendanceCreditTransactionReason}(세부 사유)과 짝을 이룬다 — {@code type}은
 * "지급/소모/충전/환불" 4종 대분류, {@code reason}은 "출석체크/스트릭보너스/제안발송/..." 세부 사유다.</p>
 */
public enum AttendanceCreditTransactionType {
    /** 무료 지급(출석체크·스트릭 보너스) — 지급일 +30일 후 소멸(무료분만). */
    GRANT,
    /** 소모(제안 발송·지원서 열람+채팅 개설 등 능동적 매칭 행위). */
    CONSUME,
    /** 유료 충전(IAP) — 무기한. Phase C(별도 착수) 전까지는 스키마만 보유. */
    TOPUP,
    /** 환불 — 무기한. */
    REFUND
}
