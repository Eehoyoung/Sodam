package com.rich.sodam.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.access.AccessDeniedException;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StepUpAttemptLimiterTest {
    private final RedisTemplate<String, Object> redis = mock(RedisTemplate.class);
    private final ValueOperations<String, Object> values = mock(ValueOperations.class);
    private final StepUpAttemptLimiter limiter = new StepUpAttemptLimiter(redis);

    @BeforeEach
    void setUp() {
        when(redis.opsForValue()).thenReturn(values);
    }

    @Test
    void fifthFailureCreatesAccountActionLock() {
        String failureKey = "security:step-up:fail:payroll-confirm:7";
        String lockKey = "security:step-up:lock:payroll-confirm:7";
        when(values.increment(failureKey)).thenReturn(5L);

        limiter.recordFailure(7L);

        verify(values).set(eq(lockKey), eq(Boolean.TRUE), eq(Duration.ofMinutes(15)));
        verify(redis).delete(failureKey);
    }

    @Test
    void activeLockAndRedisFailureBothFailClosed() {
        when(redis.hasKey("security:step-up:lock:payroll-confirm:7")).thenReturn(true);
        assertThatThrownBy(() -> limiter.assertAllowed(7L)).isInstanceOf(AccessDeniedException.class);

        reset(redis);
        when(redis.hasKey(anyString())).thenThrow(new IllegalStateException("redis unavailable"));
        assertThatThrownBy(() -> limiter.assertAllowed(7L)).isInstanceOf(AccessDeniedException.class);
    }
}
