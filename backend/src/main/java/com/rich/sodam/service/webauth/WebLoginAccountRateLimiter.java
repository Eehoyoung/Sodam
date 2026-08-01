package com.rich.sodam.service.webauth;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 로그인 — 계정(이메일) 기준 rate limit: 분당 10회 (04_보안정책.md §4).
 * 웹 콘솔 로그인({@link com.rich.sodam.controller.WebAuthController})뿐 아니라 모바일 로그인
 * ({@link com.rich.sodam.controller.LoginController})도 동일 계정 보호 목적으로 이 빈을 공유한다 —
 * IP 기준({@link com.rich.sodam.config.RateLimitFilter})은 채널별로 갈라져 있지만, 계정 자체를
 * 노리는 brute-force 방어는 채널과 무관하게 같은 계정이면 합산돼야 우회를 막을 수 있다.
 *
 * <p>IP 기준 rate limit({@link com.rich.sodam.config.RateLimitFilter})은 요청 바디(JSON)를
 * 읽지 못하는 서블릿 필터 계층에서 처리하지만, 계정 기준은 이메일이 JSON 바디 안에 있어
 * {@code @RequestBody} 로 파싱된 이후(컨트롤러/서비스 계층)에만 알 수 있다 — 그래서 필터가
 * 아닌 별도 컴포넌트로 분리했다.
 *
 * <p>기존 {@link com.rich.sodam.config.RateLimitFilter} 와 동일하게 순수 in-memory Bucket4j를
 * 사용한다(운영 다중 인스턴스 환경에서는 Redis 백엔드 권장 — 기존 필터와 동일한 기지 한계).
 *
 * <p>Phase 0 코드리뷰 지적사항: 이 맵은 요청받은 이메일마다 버킷을 무기한 보유해 메모리가
 * 계속 늘어난다({@link InMemoryLoginLockoutService}와 달리 스윕이 없었음). 버킷이 가득 찬 상태
 * (최근 1분간 소비가 없었다는 뜻 — refill 주기가 10개/분이므로)면 안전하게 제거해도 다음 요청 시
 * 새 버킷이 동일하게 재생성될 뿐이라 동작에 영향이 없다.
 */
@Slf4j
@Component
public class WebLoginAccountRateLimiter {

    private static final int CAPACITY = 10;

    private final Map<String, Bucket> accountBuckets = new ConcurrentHashMap<>();
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "web-login-account-rate-limiter-cleaner");
        t.setDaemon(true);
        return t;
    });

    public WebLoginAccountRateLimiter() {
        cleaner.scheduleAtFixedRate(this::sweepIdleBuckets, 5, 5, TimeUnit.MINUTES);
    }

    private Bucket resolveBucket(String accountKey) {
        return accountBuckets.computeIfAbsent(accountKey, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(CAPACITY, Refill.intervally(CAPACITY, Duration.ofMinutes(1))))
                .build());
    }

    /** 소비 가능하면 true, 초과 시 false. */
    public boolean tryConsume(String accountKey) {
        return resolveBucket(accountKey).tryConsume(1);
    }

    private void sweepIdleBuckets() {
        int before = accountBuckets.size();
        accountBuckets.entrySet().removeIf(e -> e.getValue().getAvailableTokens() >= CAPACITY);
        int removed = before - accountBuckets.size();
        if (removed > 0) {
            log.debug("WebLoginAccountRateLimiter: idle 버킷 {}건 정리(전체 {}건 중)", removed, before);
        }
    }

    @PreDestroy
    void shutdown() {
        cleaner.shutdownNow();
    }
}
