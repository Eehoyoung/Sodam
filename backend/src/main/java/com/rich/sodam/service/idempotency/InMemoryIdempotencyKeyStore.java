package com.rich.sodam.service.idempotency;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * dev/test 프로필용 In-memory 멱등성 키 저장소. 단일 인스턴스에서만 유효 — 운영 사용 금지.
 * {@link com.rich.sodam.service.InMemoryTokenStore}와 동일한 TTL 청소 스레드 패턴을 따른다.
 */
@Slf4j
@Service
@Profile({"dev", "test"})
public class InMemoryIdempotencyKeyStore implements IdempotencyKeyStore {

    private final ConcurrentHashMap<String, Long> store = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "idempotency-key-cleaner");
        t.setDaemon(true);
        return t;
    });

    public InMemoryIdempotencyKeyStore() {
        cleaner.scheduleAtFixedRate(this::sweepExpired, 60, 60, TimeUnit.SECONDS);
        log.info("InMemoryIdempotencyKeyStore active — dev/test profile only. DO NOT use in production.");
    }

    @Override
    public boolean tryClaim(String idempotencyKey, String scope, Duration ttl) {
        long now = System.currentTimeMillis();
        // compute 는 같은 키에 대해 원자적으로 실행된다 — 만료된 항목의 재선점까지 한 연산으로 처리한다.
        Long[] claimed = new Long[1];
        store.compute(key(idempotencyKey, scope), (k, expiresAt) -> {
            if (expiresAt != null && expiresAt > now) {
                return expiresAt; // 이미 유효한 선점이 있다
            }
            claimed[0] = now + ttl.toMillis();
            return claimed[0];
        });
        return claimed[0] != null;
    }

    @Override
    public void release(String idempotencyKey, String scope) {
        store.remove(key(idempotencyKey, scope));
    }

    private void sweepExpired() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue() < now);
    }

    private String key(String idempotencyKey, String scope) {
        return scope + ":" + idempotencyKey;
    }
}
