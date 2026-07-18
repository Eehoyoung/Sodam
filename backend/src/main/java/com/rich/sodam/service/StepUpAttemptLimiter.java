package com.rich.sodam.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/** 고위험 step-up 실패를 계정+행위 기준으로 공유 Redis에 제한한다. */
@Component
public class StepUpAttemptLimiter {
    private static final int MAX_FAILURES = 5;
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(10);
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final String ACTION = "payroll-confirm";

    private final RedisTemplate<String, Object> redis;

    public StepUpAttemptLimiter(
            @Qualifier("cacheRedisTemplate") RedisTemplate<String, Object> redis) {
        this.redis = redis;
    }

    public void assertAllowed(Long userId) {
        requireUserId(userId);
        try {
            if (Boolean.TRUE.equals(redis.hasKey(lockKey(userId)))) {
                throw locked();
            }
        } catch (AccessDeniedException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new AccessDeniedException("고위험 행위 재인증 상태를 확인할 수 없습니다.");
        }
    }

    public void recordFailure(Long userId) {
        requireUserId(userId);
        try {
            String failureKey = failureKey(userId);
            Long count = redis.opsForValue().increment(failureKey);
            if (count == null) throw new IllegalStateException("step-up 실패 횟수를 기록할 수 없습니다.");
            if (count == 1L) redis.expire(failureKey, FAILURE_WINDOW);
            if (count >= MAX_FAILURES) {
                redis.opsForValue().set(lockKey(userId), Boolean.TRUE, LOCK_DURATION);
                redis.delete(failureKey);
            }
        } catch (RuntimeException e) {
            throw new AccessDeniedException("고위험 행위 재인증을 처리할 수 없습니다.");
        }
    }

    public void recordSuccess(Long userId) {
        requireUserId(userId);
        try {
            redis.delete(List.of(failureKey(userId), lockKey(userId)));
        } catch (RuntimeException e) {
            // 비밀번호 검증은 성공했지만 제한 상태를 초기화하지 못하면 fail-closed한다.
            throw new AccessDeniedException("고위험 행위 재인증 상태를 초기화할 수 없습니다.");
        }
    }

    private String failureKey(Long userId) {
        return "security:step-up:fail:" + ACTION + ":" + userId;
    }

    private String lockKey(Long userId) {
        return "security:step-up:lock:" + ACTION + ":" + userId;
    }

    private void requireUserId(Long userId) {
        if (userId == null) throw new AccessDeniedException("로그인이 필요합니다.");
    }

    private AccessDeniedException locked() {
        return new AccessDeniedException("비밀번호 재확인 실패가 누적되어 잠시 후 다시 시도해야 합니다.");
    }
}
