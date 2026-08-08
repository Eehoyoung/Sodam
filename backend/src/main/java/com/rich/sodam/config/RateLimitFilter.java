package com.rich.sodam.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * 단순 IP 기반 Rate Limit — Bucket4j 메모리 백엔드.
 *
 * 적용 범위:
 *  - POST /api/login                     : IP+이메일별 5회/분 (brute-force 강화)
 *  - POST /api/web/auth/login            : IP별 5회/분 (04_보안정책.md §4 — 웹 콘솔 로그인).
 *                                           계정(이메일) 기준 10회/분은 JSON 바디를 읽어야 해서
 *                                           이 필터가 아닌 컨트롤러 계층의
 *                                           {@link com.rich.sodam.service.webauth.WebLoginAccountRateLimiter}
 *                                           가 처리한다 — 필터는 요청 바디를 소비하지 않는다.
 *  - POST /api/auth/password-reset/**    : IP별 3회/분 (이메일 폭주 차단)
 *  - POST /api/join, /api/auth/refresh   : IP별 20회/분 (가입/refresh)
 *  - POST /api/chat-rooms/{id}/messages  : IP별 30회/분 (채팅 도배 스팸 방지,
 *                                           recruitment-monetization-gamification-plan.md §4.5)
 *  - 그 외 /api/**                       : IP별 120회/분
 *
 * 운영 다중 인스턴스 환경에서는 Redis 백엔드(Bucket4j Lettuce) 권장.
 */
@Slf4j
@Component
@Order(1) // 가장 앞 단에서 차단
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int DEFAULT_MAX_BUCKETS_PER_POLICY = 10_000;
    private static final Duration BUCKET_IDLE_TTL = Duration.ofMinutes(10);
    private static final long CLEANUP_INTERVAL_NANOS = Duration.ofMinutes(1).toNanos();

    private static final java.util.regex.Pattern CHAT_MESSAGE_SEND_PATH =
            java.util.regex.Pattern.compile("^/api/chat-rooms/\\d+/messages$");

    private final Map<String, BucketEntry> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> webLoginIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> resetBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> chatMessageBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> publicBuckets = new ConcurrentHashMap<>();
    private final Map<String, BucketEntry> generalBuckets = new ConcurrentHashMap<>();
    private final int maxBucketsPerPolicy;
    private final AtomicLong nextCleanupNanos = new AtomicLong();

    public RateLimitFilter() {
        this(DEFAULT_MAX_BUCKETS_PER_POLICY);
    }

    RateLimitFilter(int maxBucketsPerPolicy) {
        this.maxBucketsPerPolicy = maxBucketsPerPolicy;
    }

    @Value("${sodam.security.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders;

    @Value("${sodam.security.trusted-proxy-ips:}")
    private String trustedProxyIps;

    private Bucket resolveLoginBucket(String key) {
        return resolveBucket(loginBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveWebLoginIpBucket(String key) {
        return resolveBucket(webLoginIpBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveResetBucket(String key) {
        return resolveBucket(resetBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveAuthBucket(String key) {
        return resolveBucket(authBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(20, Refill.intervally(20, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveChatMessageBucket(String key) {
        return resolveBucket(chatMessageBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(30, Refill.intervally(30, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolvePublicBucket(String key) {
        return resolveBucket(publicBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(30, Refill.intervally(30, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveGeneralBucket(String key) {
        return resolveBucket(generalBuckets, key, () -> Bucket.builder()
                .addLimit(Bandwidth.classic(120, Refill.intervally(120, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveBucket(Map<String, BucketEntry> buckets, String key, Supplier<Bucket> factory) {
        long now = System.nanoTime();
        cleanupExpiredBuckets(now);
        BucketEntry entry = buckets.compute(key, (ignored, current) -> current == null
                ? new BucketEntry(factory.get(), now)
                : current.touch(now));
        enforceMaximumSize(buckets);
        return entry.bucket();
    }

    private void cleanupExpiredBuckets(long now) {
        long scheduled = nextCleanupNanos.get();
        if (now < scheduled || !nextCleanupNanos.compareAndSet(scheduled, now + CLEANUP_INTERVAL_NANOS)) {
            return;
        }
        long cutoff = now - BUCKET_IDLE_TTL.toNanos();
        for (Map<String, BucketEntry> buckets : java.util.List.of(
                loginBuckets, webLoginIpBuckets, resetBuckets, authBuckets, chatMessageBuckets,
                publicBuckets, generalBuckets)) {
            buckets.entrySet().removeIf(entry -> entry.getValue().lastSeenNanos() < cutoff);
        }
    }

    private void enforceMaximumSize(Map<String, BucketEntry> buckets) {
        while (buckets.size() > maxBucketsPerPolicy) {
            buckets.entrySet().stream()
                    .min(Comparator.comparingLong(entry -> entry.getValue().lastSeenNanos()))
                    .ifPresent(entry -> buckets.remove(entry.getKey(), entry.getValue()));
        }
    }

    int bucketCountForTest() {
        return loginBuckets.size() + webLoginIpBuckets.size() + resetBuckets.size()
                + authBuckets.size() + chatMessageBuckets.size() + publicBuckets.size()
                + generalBuckets.size();
    }

    private record BucketEntry(Bucket bucket, long lastSeenNanos) {
        BucketEntry touch(long now) {
            return new BucketEntry(bucket, now);
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        // 정적·헬스체크는 우회
        if (path.startsWith("/swagger-ui") || path.startsWith("/api-docs") ||
                path.startsWith("/actuator") || path.startsWith("/h2-console") ||
                path.startsWith("/webjars")) {
            chain.doFilter(request, response);
            return;
        }
        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        Bucket bucket;
        if (path.equals("/api/login")) {
            // 보안: brute-force 방지 — IP + 이메일 조합 키로 5/분
            // JSON body뿐 아니라 query/form 파라미터도 임의로 조작할 수 있으므로 이메일을 버킷 키에 넣지 않는다.
            // 같은 IP에서 이메일 값을 바꿔 무한히 버킷을 만드는 우회와 메모리 증가를 차단한다.
            String key = clientIp;
            bucket = resolveLoginBucket(key);
        } else if (path.equals("/api/web/auth/login")) {
            // 04_보안정책.md §4 — 웹 콘솔 로그인 IP별 5/분. 계정(이메일) 기준 10/분은
            // WebLoginAccountRateLimiter(컨트롤러 계층)가 별도 처리(JSON 바디는 필터가 못 읽음).
            bucket = resolveWebLoginIpBucket(clientIp);
        } else if (path.startsWith("/api/auth/password-reset")) {
            // 보안: 이메일 폭주 방지 — IP 단위 3/분
            bucket = resolveResetBucket(clientIp);
        } else if (path.equals("/api/join") || path.equals("/api/auth/refresh")) {
            bucket = resolveAuthBucket(clientIp);
        } else if (path.startsWith("/api/public/")) {
            // 공개 계산기(WP-A) — 인증이 없어 남용 표면이 넓다. 일반 120/분보다 낮은 30/분 전용 한도.
            // 사람이 계산기를 쓰는 빈도로는 넉넉하고, 스크립트 반복 호출은 걸린다.
            bucket = resolvePublicBucket(clientIp);
        } else if ("POST".equalsIgnoreCase(request.getMethod()) && CHAT_MESSAGE_SEND_PATH.matcher(path).matches()) {
            // 채팅 도배 스팸 방지 — 일반 120/분보다 낮은 전용 한도(recruitment-monetization-gamification-plan.md §4.5)
            bucket = resolveChatMessageBucket(clientIp);
        } else {
            bucket = resolveGeneralBucket(clientIp);
        }

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded ip={} path={}", clientIp, path);
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"too_many_requests\",\"message\":\"잠시 후 다시 시도해 주세요.\"}");
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (trustForwardedHeaders && isTrustedProxy(request.getRemoteAddr())) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private boolean isTrustedProxy(String remoteAddr) {
        if (trustedProxyIps == null || trustedProxyIps.isBlank()) {
            return false;
        }
        return Arrays.stream(trustedProxyIps.split(","))
                .map(String::trim)
                .anyMatch(remoteAddr::equals);
    }
}
