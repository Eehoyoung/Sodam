package com.rich.sodam.config.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * 토스 결제 Mock — 외부 호출 없이 결정적 응답을 반환.
 * 동작 조건: {@code sodam.integration.toss.mode=mock} (dev 프로필 기본)
 *
 * 시나리오:
 *  - authKey 가 "FAIL_*" 으로 시작 → issueBillingKey 실패
 *  - orderId 가 "FAIL_*" 으로 시작 → charge 실패
 *  - 그 외 → 성공
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.toss", name = "mode", havingValue = "mock", matchIfMissing = false)
public class MockTossBillingClient implements TossBillingClient {

    @Override
    public BillingKeyResult issueBillingKey(String authKey, String customerKey) {
        if (authKey != null && authKey.startsWith("FAIL_")) {
            throw new IllegalStateException("[MOCK] 빌링키 발급 실패: " + authKey);
        }
        String billingKey = "MOCK_BK_" + UUID.randomUUID().toString().substring(0, 16).toUpperCase();
        log.info("[MOCK Toss] issueBillingKey customerKey={} → billingKey={}", customerKey, billingKey);
        return new BillingKeyResult(billingKey, "테스트카드 1234******5678", customerKey);
    }

    @Override
    public ChargeResult charge(ChargeRequest request) {
        if (request.getOrderId() != null && request.getOrderId().startsWith("FAIL_")) {
            log.warn("[MOCK Toss] charge intentionally failed: {}", request.getOrderId());
            return ChargeResult.fail("MOCK_FAILURE");
        }
        String paymentKey = "MOCK_PK_" + UUID.randomUUID().toString().substring(0, 24).toUpperCase();
        log.info("[MOCK Toss] charge {} amount={} → paymentKey={}",
                request.getOrderId(), request.getAmount(), paymentKey);
        return ChargeResult.ok(paymentKey);
    }

    @Override
    public void cancel(String paymentKey, String reason) {
        log.info("[MOCK Toss] cancel paymentKey={} reason={}", paymentKey, reason);
    }
}
