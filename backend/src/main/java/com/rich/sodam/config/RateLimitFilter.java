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
 *  - POST /api/login, /api/join, /api/auth/refresh : 분당 20회
 *  - 그 외 /api/** : 분당 120회
 *
 * 운영 다중 인스턴스 환경에서는 Redis 백엔드(Bucket4j Lettuce) 권장.
 */
@Slf4j
@Component
@Order(1) // 가장 앞 단에서 차단
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

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
        if (path.equals("/api/login") || path.equals("/api/join") || path.equals("/api/auth/refresh")) {
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
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
