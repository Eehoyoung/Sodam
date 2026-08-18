package com.rich.sodam.service.idempotency;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Redis 백엔드 멱등성 키 저장소. dev/test 프로필에서는 {@link InMemoryIdempotencyKeyStore}가 대신 등록된다.
 *
 * <p>세션 전용 Redis(웹 콘솔, 물리 분리)와는 별개로, 기존 캐시/토큰용 Redis({@code cacheRedisTemplate})를
 * 재사용한다 — 05_동시성제어_및_고급아키텍처.md §3.
 */
@Service
@Profile("!dev & !test")
public class RedisIdempotencyKeyStore implements IdempotencyKeyStore {

    private static final String KEY_PREFIX = "idempotency:";

    private final RedisTemplate<String, Object> redis;

    public RedisIdempotencyKeyStore(@Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redis) {
        this.redis = redis;
    }

    @Override
    public boolean tryClaim(String idempotencyKey, String scope, Duration ttl) {
        // SET NX EX — 존재 확인과 기록이 한 명령이라 인스턴스가 여러 대여도 경쟁이 없다.
        return Boolean.TRUE.equals(
                redis.opsForValue().setIfAbsent(redisKey(idempotencyKey, scope), Boolean.TRUE, ttl));
    }

    @Override
    public void release(String idempotencyKey, String scope) {
        redis.delete(redisKey(idempotencyKey, scope));
    }

    private String redisKey(String idempotencyKey, String scope) {
        return KEY_PREFIX + scope + ":" + idempotencyKey;
    }
}
