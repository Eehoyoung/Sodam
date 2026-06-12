package com.rich.sodam.domain.type;

/**
 * 구독 상태 머신.
 *
 * PENDING_PAYMENT → ACTIVE → (PAST_DUE) → CANCELLED / EXPIRED
 *                       ↕ PAUSED (비수기 일시정지)
 *
 * - PENDING_PAYMENT : 빌링키 발급 직후, 첫 결제 시도 전
 * - ACTIVE         : 결제 성공, 활성
 * - PAST_DUE       : 결제 실패, 재시도 중 (최대 3회 / 7일)
 * - PAUSED         : 사용자 일시정지(비수기). 청구 보류, 남은 기간 보존. resume 시 ACTIVE 복귀
 * - CANCELLED      : 사용자 자발 해지 (다음 결제일 전까지는 ACTIVE 유지 후 EXPIRED)
 * - EXPIRED        : 만료 (재시도 실패 또는 해지 후 기간 종료)
 */
public enum SubscriptionStatus {
    PENDING_PAYMENT,
    ACTIVE,
    PAST_DUE,
    PAUSED,
    CANCELLED,
    EXPIRED
}
