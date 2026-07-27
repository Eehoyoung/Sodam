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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
 *  - 그 외 /api/**                       : IP별 120회/분
 *
 * 운영 다중 인스턴스 환경에서는 Redis 백엔드(Bucket4j Lettuce) 권장.
 */
@Slf4j
@Component
@Order(1) // 가장 앞 단에서 차단
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();   // 강화: 5/분
    private final Map<String, Bucket> webLoginIpBuckets = new ConcurrentHashMap<>(); // 웹 콘솔 로그인 IP: 5/분
    private final Map<String, Bucket> resetBuckets = new ConcurrentHashMap<>();   // 강화: 3/분
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();    // 20/분
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>(); // 120/분

    @Value("${sodam.security.trust-forwarded-headers:false}")
    private boolean trustForwardedHeaders;

    private Bucket resolveLoginBucket(String key) {
        return loginBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveWebLoginIpBucket(String key) {
        return webLoginIpBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveResetBucket(String key) {
        return resetBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveAuthBucket(String key) {
        return authBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(20, Refill.intervally(20, Duration.ofMinutes(1))))
                .build());
    }

    private Bucket resolveGeneralBucket(String key) {
        return generalBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(120, Refill.intervally(120, Duration.ofMinutes(1))))
                .build());
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
            String email = request.getParameter("email");
            String key = clientIp + "|" + (email != null ? email.toLowerCase() : "_");
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
        if (trustForwardedHeaders) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
