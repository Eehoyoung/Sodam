package com.rich.sodam.service.lock;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * dev/test 프로필용 In-memory 분산 락. 단일 인스턴스에서만 유효 — 운영 사용 금지.
 *
 * <p>{@link DistributedLockService}와 동일한 의미론을 {@link ConcurrentHashMap#compute}의
 * 원자성으로 재현한다: 획득은 "키가 없거나 만료됐을 때만 내 토큰으로 채우기", 해제는
 * "현재 값이 내 토큰과 일치할 때만 지우기" — 둘 다 단일 compute 호출 안에서 원자적으로 수행된다.
 */
@Slf4j
@Service
@Profile({"dev", "test"})
public class InMemoryDistributedLockService implements DistributedLockService {

    private record Entry(String token, long expiresAtMillis) {
        boolean isExpired(long nowMillis) {
            return expiresAtMillis < nowMillis;
        }
    }

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();

    public InMemoryDistributedLockService() {
        log.info("InMemoryDistributedLockService active — dev/test profile only. DO NOT use in production.");
    }

    @Override
    public boolean tryLock(String key, String token, Duration ttl) {
        long now = System.currentTimeMillis();
        long expiresAt = now + ttl.toMillis();
        boolean[] acquired = {false};
        store.compute(key, (k, existing) -> {
            if (existing == null || existing.isExpired(now)) {
                acquired[0] = true;
                return new Entry(token, expiresAt);
            }
            return existing;
        });
        return acquired[0];
    }

    @Override
    public void unlock(String key, String token) {
        store.computeIfPresent(key, (k, existing) -> existing.token().equals(token) ? null : existing);
    }
}
