package com.rich.sodam.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * dev/에뮬레이터 프로필용 In-Memory 토큰 저장소.
 * Redis 의존성 없이 동작하며, TTL 기반 자동 만료 + 1분 단위 청소 스레드를 갖는다.
 * 단일 인스턴스에서만 유효 — 운영 환경 사용 금지.
 */
@Slf4j
@Service
@Profile({"dev", "test"})
public class InMemoryTokenStore implements TokenStore {

    /** key = "USER_TOKENS:{userId}", inner key = tokenHash, inner value = expiresAtMillis */
    private final Map<String, Map<String, Long>> store = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "in-memory-token-cleaner");
        t.setDaemon(true);
        return t;
    });

    public InMemoryTokenStore() {
        cleaner.scheduleAtFixedRate(this::sweepExpired, 60, 60, TimeUnit.SECONDS);
        log.warn("InMemoryTokenStore active — dev profile only. DO NOT use in production.");
    }

    @Override
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("토큰 해싱 중 에러 발생", e);
        }
    }

    @Override
    public void saveToken(Long userId, String token, long expirationSeconds) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        long expiresAt = System.currentTimeMillis() + (expirationSeconds * 1000L);
        store.computeIfAbsent(key, k -> new ConcurrentHashMap<>()).put(tokenHash, expiresAt);
    }

    @Override
    public boolean verifyToken(String userId, String token) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        Map<String, Long> userTokens = store.get(key);
        if (userTokens == null) return false;
        Long expiresAt = userTokens.get(tokenHash);
        if (expiresAt == null) return false;
        if (expiresAt < System.currentTimeMillis()) {
            userTokens.remove(tokenHash);
            return false;
        }
        return true;
    }

    @Override
    public void deleteToken(String userId, String token) {
        String key = "USER_TOKENS:" + userId;
        String tokenHash = hashToken(token);
        Map<String, Long> userTokens = store.get(key);
        if (userTokens != null) {
            userTokens.remove(tokenHash);
        }
    }

    private void sweepExpired() {
        long now = System.currentTimeMillis();
        store.forEach((k, inner) -> inner.entrySet().removeIf(e -> e.getValue() < now));
        store.entrySet().removeIf(e -> e.getValue().isEmpty());
    }
}
