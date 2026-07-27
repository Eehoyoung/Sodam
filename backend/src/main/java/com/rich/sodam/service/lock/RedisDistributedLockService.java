package com.rich.sodam.service.lock;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * Redis {@code SET NX PX} + Lua 원자적 해제 기반 분산 락 (05_동시성제어_및_고급아키텍처.md §7).
 * dev/test 프로필에서는 {@link InMemoryDistributedLockService}가 대신 등록된다.
 */
@Service
@Profile("!dev & !test")
public class RedisDistributedLockService implements DistributedLockService {

    private static final String LOCK_KEY_PREFIX = "lock:";

    /** 현재 값이 내 토큰과 같을 때만 삭제 — 락 소유자가 아닌 요청의 오삭제 방지. */
    private static final String UNLOCK_SCRIPT =
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "  return redis.call('del', KEYS[1]) " +
            "else " +
            "  return 0 " +
            "end";

    private final RedisTemplate<String, Object> redis;
    private final RedisScript<Long> unlockScript = new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class);

    public RedisDistributedLockService(@Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redis) {
        this.redis = redis;
    }

    @Override
    public boolean tryLock(String key, String token, Duration ttl) {
        // SET key token NX PX ttl 과 동일한 원자적 연산.
        Boolean acquired = redis.opsForValue().setIfAbsent(lockKey(key), token, ttl);
        return Boolean.TRUE.equals(acquired);
    }

    @Override
    public void unlock(String key, String token) {
        redis.execute(unlockScript, List.of(lockKey(key)), token);
    }

    private String lockKey(String key) {
        return LOCK_KEY_PREFIX + key;
    }
}
