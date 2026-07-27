package com.rich.sodam.security.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * 웹 콘솔 세션 절대 만료(12시간) — 04_보안정책.md §1: "30분 유휴 만료 + 12시간 절대 만료
 * (둘 중 먼저 도달하는 조건 적용)". Spring Session 은 유휴(idle) 만료만 기본 지원하고 절대
 * 만료는 지원하지 않으므로, 세션 생성 시각({@link HttpSession#getCreationTime()} — Spring
 * Session 구현체도 갱신되지 않는 불변 생성시각을 제공)을 기준으로 직접 계산해 강제 만료시킨다.
 *
 * <p>Spring Security 의 {@code SecurityContextHolderFilter} 보다 앞서 실행되도록 배선해야 한다
 * (그래야 이번 요청부터 곧바로 "미인증"으로 취급되어 401 을 반환한다 — 세션만 무효화하고 이미
 * 로드된 SecurityContext 를 그대로 두면 이번 요청은 여전히 인증된 것처럼 통과해버린다).
 */
@Slf4j
public class SessionAbsoluteExpiryFilter extends OncePerRequestFilter {

    private final Duration absoluteTtl;

    public SessionAbsoluteExpiryFilter(Duration absoluteTtl) {
        this.absoluteTtl = absoluteTtl;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session != null) {
            long ageMillis = System.currentTimeMillis() - session.getCreationTime();
            if (ageMillis > absoluteTtl.toMillis()) {
                log.debug("웹 세션 절대 만료(12h) 도달 — 세션 무효화");
                session.invalidate();
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
