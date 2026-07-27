package com.rich.sodam.service.webauth;

import com.rich.sodam.exception.AccountLockedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * dev/test 프로필용 In-memory 계정 잠금 저장소. 단일 인스턴스에서만 유효 — 운영 사용 금지.
 * {@link com.rich.sodam.service.InMemoryTokenStore} 와 동일한 TTL 청소 스레드 패턴을 따른다.
 */
@Slf4j
@Service
@Profile({"dev", "test"})
public class InMemoryLoginLockoutService implements LoginLockoutService {

    /** 실패 카운터·잠금 상태는 계정당 하나의 가변 레코드로 관리한다. */
    private static final class MutableRecord {
        final AtomicInteger failureCount = new AtomicInteger(0);
        volatile long lockedUntilMillis = 0L;
        volatile long lastUpdatedMillis = System.currentTimeMillis();
    }

    private final ConcurrentHashMap<String, MutableRecord> store = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "login-lockout-cleaner");
        t.setDaemon(true);
        return t;
    });

    /** 실패 카운터 유효 기간 — 이 기간 동안 5회에 도달하지 못하면 "연속 실패"로 보지 않고 리셋한다. */
    private static final Duration FAILURE_WINDOW = Duration.ofMinutes(LOCK_DURATION_MINUTES);

    public InMemoryLoginLockoutService() {
        cleaner.scheduleAtFixedRate(this::sweepExpired, 60, 60, TimeUnit.SECONDS);
        log.warn("InMemoryLoginLockoutService active — dev/test profile only. DO NOT use in production.");
    }

    @Override
    public void assertNotLocked(String accountKey) {
        MutableRecord record = store.get(accountKey);
        if (record == null) {
            return;
        }
        long now = System.currentTimeMillis();
        if (record.lockedUntilMillis > now) {
            throw new AccountLockedException((record.lockedUntilMillis - now) / 1000);
        }
    }

    @Override
    public void recordFailure(String accountKey) {
        long now = System.currentTimeMillis();
        MutableRecord record = store.compute(accountKey, (key, existing) -> {
            if (existing == null || now - existing.lastUpdatedMillis > FAILURE_WINDOW.toMillis()) {
                return new MutableRecord();
            }
            return existing;
        });
        record.lastUpdatedMillis = now;
        int failures = record.failureCount.incrementAndGet();
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
            record.lockedUntilMillis = now + Duration.ofMinutes(LOCK_DURATION_MINUTES).toMillis();
            log.warn("계정 잠금 발동 - accountKey={} (연속 실패 {}회)", maskAccountKey(accountKey), failures);
        }
    }

    @Override
    public void recordSuccess(String accountKey) {
        store.remove(accountKey);
    }

    private void sweepExpired() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> e.getValue().lockedUntilMillis < now
                && now - e.getValue().lastUpdatedMillis > FAILURE_WINDOW.toMillis());
    }

    private String maskAccountKey(String accountKey) {
        if (accountKey == null || accountKey.isBlank()) {
            return "(empty)";
        }
        int at = accountKey.indexOf('@');
        if (at <= 1) {
            return "*".repeat(accountKey.length());
        }
        return accountKey.charAt(0) + "***" + accountKey.substring(at);
    }
}
