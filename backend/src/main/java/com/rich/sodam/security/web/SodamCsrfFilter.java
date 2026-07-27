package com.rich.sodam.security.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Set;

/**
 * 웹 콘솔 CSRF 방어 — 자체 구현 Double Submit Cookie 패턴(04_보안정책.md §2).
 * Spring Security 기본 CSRF 토큰 저장소는 의도적으로 사용하지 않는다(문서 명시 결정).
 *
 * <p>동작:
 * <ol>
 *   <li>안전 메서드(GET/HEAD/OPTIONS/TRACE)는 검증 없이 통과.</li>
 *   <li>로그인 엔드포인트({@code POST /api/web/auth/login})는 예외 — 로그인 이전에는 아직
 *       CSRF 토큰이 발급되지 않았으므로 검증할 대상이 없다(선유효 토큰 요구는 순환 의존).
 *       이후 로그아웃 등 인증된 상태변경 요청부터는 정상적으로 검증 대상이다.</li>
 *   <li>{@code Origin}(없으면 {@code Referer}) 헤더가 허용 목록에 없으면 403.</li>
 *   <li>{@code X-Sodam-CSRF} 헤더 값이 로그인 시 세션에 저장해둔 토큰과 일치하지 않으면 403.</li>
 * </ol>
 */
@Slf4j
public class SodamCsrfFilter extends OncePerRequestFilter {

    public static final String CSRF_SESSION_ATTR = "SODAM_CSRF_TOKEN";
    public static final String CSRF_HEADER = "X-Sodam-CSRF";

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
    private static final String LOGIN_PATH = "/api/web/auth/login";

    private final List<String> allowedOrigins;

    public SodamCsrfFilter(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String method = request.getMethod();
        if (SAFE_METHODS.contains(method) || LOGIN_PATH.equals(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!originAllowed(request)) {
            log.warn("CSRF 방어: 허용되지 않은 Origin/Referer - path={}", request.getRequestURI());
            reject(response, "허용되지 않은 출처의 요청이에요.");
            return;
        }

        if (!csrfTokenValid(request)) {
            log.warn("CSRF 방어: 토큰 불일치/누락 - path={}", request.getRequestURI());
            reject(response, "CSRF 토큰이 유효하지 않아요. 새로고침 후 다시 시도해 주세요.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean originAllowed(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        String source = origin;
        if (source == null || source.isBlank()) {
            source = request.getHeader("Referer");
        }
        // 브라우저가 아닌 서버-투-서버 호출 등 Origin/Referer 자체가 없는 요청은 이 필터의 보호 대상이
        // 아니지만(브라우저 CSRF 공격은 항상 Origin/Referer 를 동반), 안전 기본값으로 거부한다.
        if (source == null || source.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(source);
            String originHost = uri.getScheme() + "://" + uri.getAuthority();
            return allowedOrigins.contains(originHost);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private boolean csrfTokenValid(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return false;
        }
        Object expected = session.getAttribute(CSRF_SESSION_ATTR);
        String provided = request.getHeader(CSRF_HEADER);
        if (!(expected instanceof String expectedToken) || provided == null || provided.isBlank()) {
            return false;
        }
        byte[] expectedBytes = expectedToken.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        return expectedBytes.length == providedBytes.length && MessageDigest.isEqual(expectedBytes, providedBytes);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"errorCode\":\"CSRF_VALIDATION_FAILED\",\"message\":\"" + message + "\"}");
    }
}
