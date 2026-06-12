package com.rich.sodam.config.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * 토스 단건결제 Mock — 외부 호출 없이 결정적 응답.
 * 동작 조건: {@code sodam.integration.toss.mode=mock}(dev/test 기본).
 *
 * - orderId 가 "FAIL_" 으로 시작 → 승인 실패. 그 외 성공(DONE).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.toss", name = "mode", havingValue = "mock", matchIfMissing = false)
public class MockTossPaymentGateway implements TossPaymentGateway {

    @Override
    public ConfirmResult confirm(String paymentKey, String orderId, int amount) {
        if (orderId != null && orderId.startsWith("FAIL_")) {
            log.warn("[MOCK Toss] 단건결제 승인 실패: {}", orderId);
            return ConfirmResult.fail("MOCK_FAILURE");
        }
        String pk = paymentKey != null ? paymentKey : "MOCK_PK_" + UUID.randomUUID().toString().substring(0, 16);
        log.info("[MOCK Toss] 단건결제 승인 orderId={} amount={} → {}", orderId, amount, pk);
        return ConfirmResult.ok(pk, "DONE");
    }

    @Override
    public void cancel(String paymentKey, String reason) {
        log.info("[MOCK Toss] 단건결제 취소 paymentKey={} reason={}", paymentKey, reason);
    }
}
