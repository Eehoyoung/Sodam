package com.rich.sodam.service;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;

/** FE 복귀 refresh 폭주를 사용자+envelope 기준 5초 간격으로 제한한다. */
@Component
public class ElectronicSignatureRefreshLimiter {
    private static final long INTERVAL_MILLIS = 5_000L;
    private final ConcurrentHashMap<String, Long> lastAccepted = new ConcurrentHashMap<>();
    private final Clock clock = Clock.systemUTC();

    public void check(Long userId, Long envelopeId) {
        String key = userId + ":" + envelopeId;
        long now = clock.millis();
        lastAccepted.compute(key, (ignored, previous) -> {
            if (previous != null && now - previous < INTERVAL_MILLIS) {
                throw new TooManySignatureRefreshesException();
            }
            return now;
        });
        if (lastAccepted.size() > 10_000) {
            lastAccepted.entrySet().removeIf(e -> now - e.getValue() > 60_000L);
        }
    }

    public static class TooManySignatureRefreshesException extends RuntimeException {
        public TooManySignatureRefreshesException() { super("전자서명 상태 확인 요청이 너무 잦습니다."); }
    }
}
