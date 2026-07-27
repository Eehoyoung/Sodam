package com.rich.sodam.service.webauth;

import com.rich.sodam.exception.AccountLockedException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Redis 백엔드 계정 잠금 저장소. dev/test 프로필에서는 {@link InMemoryLoginLockoutService} 가 대신 등록된다.
 *
 * <p>세션 전용 Redis(물리 분리, {@link com.rich.sodam.config.WebSessionSecurityConfig})와는 별개로,
 * 기존 캐시/토큰용 Redis({@code cacheRedisTemplate})를 재사용한다 — 로그인 실패 카운터는 세션(로그인
 * 가용성 자체)과 달리 캐시 재시작에 영향받아도 "다시 실패 카운트가 0부터 시작"하는 정도의 낮은 리스크라
 * 별도 인스턴스 분리가 필요하지 않다고 판단했다(세션만 물리 분리가 요구사항, 01_시스템아키텍처.md §4.2).
 */
@Service
@Profile("!dev & !test")
public class RedisLoginLockoutService implements LoginLockoutService {

    private static final String FAILURE_KEY_PREFIX = "web-login:fail:";
    private static final String LOCK_KEY_PREFIX = "web-login:lock:";
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(LOCK_DURATION_MINUTES);

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisLoginLockoutService(@Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void assertNotLocked(String accountKey) {
        Boolean locked = redisTemplate.hasKey(LOCK_KEY_PREFIX + accountKey);
        if (Boolean.TRUE.equals(locked)) {
            Long ttl = redisTemplate.getExpire(LOCK_KEY_PREFIX + accountKey);
            throw new AccountLockedException(ttl != null && ttl > 0 ? ttl : Duration.ofMinutes(LOCK_DURATION_MINUTES).toSeconds());
        }
    }

    @Override
    public void recordFailure(String accountKey) {
        String failureKey = FAILURE_KEY_PREFIX + accountKey;
        Long failures = redisTemplate.opsForValue().increment(failureKey);
        if (failures != null && failures == 1L) {
            redisTemplate.expire(failureKey, FAILURE_WINDOW);
        }
        if (failures != null && failures >= MAX_CONSECUTIVE_FAILURES) {
            redisTemplate.opsForValue().set(LOCK_KEY_PREFIX + accountKey, Boolean.TRUE,
                    Duration.ofMinutes(LOCK_DURATION_MINUTES));
        }
    }

    @Override
    public void recordSuccess(String accountKey) {
        redisTemplate.delete(FAILURE_KEY_PREFIX + accountKey);
        redisTemplate.delete(LOCK_KEY_PREFIX + accountKey);
    }
}
