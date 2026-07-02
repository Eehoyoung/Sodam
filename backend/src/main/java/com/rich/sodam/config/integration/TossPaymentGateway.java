package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 토스페이먼츠 <b>단건결제</b> 게이트웨이 추상화(빌링과 별개).
 * 세무 패키지 등 일회성 결제의 승인(confirm)/취소(cancel)를 담당한다.
 *
 * mock({@link MockTossPaymentGateway}) / live({@link LiveTossPaymentGateway}) 자동 주입.
 * 참고: https://docs.tosspayments.com/reference#결제-승인
 */
public interface TossPaymentGateway {

    /**
     * 결제 승인 — FE 결제창에서 받은 paymentKey/orderId/amount 를 서버가 최종 승인.
     * 토스: POST /v1/payments/confirm
     */
    ConfirmResult confirm(String paymentKey, String orderId, int amount);

    /** 결제 취소(환불). 토스: POST /v1/payments/{paymentKey}/cancel */
    void cancel(String paymentKey, String reason);

    @Getter
    @AllArgsConstructor
    class ConfirmResult {
        private final boolean success;
        private final String paymentKey;
        private final String status;
        private final String failureReason;

        public static ConfirmResult ok(String paymentKey, String status) {
            return new ConfirmResult(true, paymentKey, status, null);
        }

        public static ConfirmResult fail(String reason) {
            return new ConfirmResult(false, null, null, reason);
        }
    }
}
