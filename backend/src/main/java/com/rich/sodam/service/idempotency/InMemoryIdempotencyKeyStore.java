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
    public boolean isProcessed(String idempotencyKey, String scope) {
        Long expiresAt = store.get(key(idempotencyKey, scope));
        if (expiresAt == null) {
            return false;
        }
        if (expiresAt < System.currentTimeMillis()) {
            store.remove(key(idempotencyKey, scope), expiresAt);
            return false;
        }
        return true;
    }

    @Override
    public void markProcessed(String idempotencyKey, String scope, Duration ttl) {
        store.put(key(idempotencyKey, scope), System.currentTimeMillis() + ttl.toMillis());
    }

    private void sweepExpired() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue() < now);
    }

    private String key(String idempotencyKey, String scope) {
        return scope + ":" + idempotencyKey;
    }
}
