package com.rich.sodam.config.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * dev/CI 용 Mock 푸시 발송기.
 * 실제 외부 호출 없이 로그만 남기고 성공 반환.
 *
 * 인메모리 카운터로 발송 횟수 추적 가능 (테스트에서 검증용).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.fcm", name = "mode", havingValue = "mock", matchIfMissing = false)
public class MockPushNotifier implements PushNotifier {

    private final AtomicInteger sentCount = new AtomicInteger();

    @Override
    public SendResult sendToToken(String token, PushMessage message) {
        sentCount.incrementAndGet();
        // Device token and notification content can both be sensitive; mock mode must not bypass logging rules.
        log.info("[MOCK FCM] notification simulated hasDeepLink={} bodyLength={}",
                message.getDeepLink() != null, message.getBody() == null ? 0 : message.getBody().length());
        return SendResult.ok();
    }

    @Override
    public SendResult sendToTokens(Iterable<String> tokens, PushMessage message) {
        int n = 0;
        for (String t : tokens) {
            sendToToken(t, message);
            n++;
        }
        return SendResult.multi(n, 0);
    }

    public int getSentCount() {
        return sentCount.get();
    }

}
