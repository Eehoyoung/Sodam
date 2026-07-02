package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 토스페이먼츠 정기결제(빌링) 클라이언트 추상화.
 * mock 모드용 {@link MockTossBillingClient} 와 live 모드용 {@link LiveTossBillingClient} 가 자동 주입된다.
 */
public interface TossBillingClient {

    /**
     * 빌링키 발급 — 카드 토큰(authKey)을 영구 식별자(billingKey)로 교환.
     * 토스: POST /v1/billing/authorizations/issue
     */
    BillingKeyResult issueBillingKey(String authKey, String customerKey);

    /**
     * 정기결제 청구 — 발급된 빌링키로 실제 청구.
     * 토스: POST /v1/billing/{billingKey}
     */
    ChargeResult charge(ChargeRequest request);

    /**
     * 결제 취소(전액 환불).
     * 토스: POST /v1/payments/{paymentKey}/cancel
     */
    void cancel(String paymentKey, String reason);

    // ===== DTOs =====

    @Getter
    @AllArgsConstructor
    class BillingKeyResult {
        private final String billingKey;
        /** 카드사명+마스킹 번호 (예: "신한카드 1234******5678") */
        private final String cardLabel;
        private final String customerKey;
    }

    @Getter
    @Builder
    class ChargeRequest {
        private final String billingKey;
        private final String customerKey;
        private final String orderId;
        private final String orderName;
        private final int amount;
        private final String customerEmail;
        private final String customerName;
    }

    @Getter
    @AllArgsConstructor
    class ChargeResult {
        private final boolean success;
        private final String paymentKey;
        private final String failureReason;
        public static ChargeResult ok(String paymentKey) {
            return new ChargeResult(true, paymentKey, null);
        }
        public static ChargeResult fail(String reason) {
            return new ChargeResult(false, null, reason);
        }
    }
}
