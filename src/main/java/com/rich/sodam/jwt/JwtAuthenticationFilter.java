package com.rich.sodam.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jetbrains.annotations.NotNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT 인증을 처리하는 필터
 * 모든 요청에 대해 한 번만 실행되도록 OncePerRequestFilter를 상속받음
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 요청에서 JWT 토큰을 추출하고 유효성을 검사하여 인증 처리를 수행합니다.
     *
     * @param request     요청 객체
     * @param response    응답 객체
     * @param filterChain 필터 체인
     * @throws ServletException 서블릿 처리 중 발생하는 예외
     * @throws IOException      입출력 처리 중 발생하는 예외
     */
    @Override
    protected void doFilterInternal(@NotNull HttpServletRequest request,
                                    @NotNull HttpServletResponse response,
                                    @NotNull FilterChain filterChain) throws ServletException, IOException {

        try {
            // 요청에서 토큰 추출 (resolveToken에서 이미 "Bearer " 접두사 제거됨)
            String token = jwtTokenProvider.resolveToken(request);

            // 토큰 유효성 검사 및 인증 처리
            if (token != null && jwtTokenProvider.validateToken(token)) {
                log.debug("유효한 JWT 토큰 발견: {}", maskToken(token));

                // 현재 SecurityContext에 인증 정보가 없는 경우에만 처리
                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    // JWT 토큰에서 인증 정보 추출 및 SecurityContext에 설정
                    org.springframework.security.core.Authentication authentication =
                            jwtTokenProvider.getAuthentication(token);

                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    Long userId = jwtTokenProvider.getUserId(token);
                    log.debug("JWT 인증 완료 - 사용자 ID: {}", userId);
                } else {
                    log.debug("이미 인증된 사용자입니다.");
                }
            } else {
                log.debug("JWT 토큰이 없거나 유효하지 않습니다.");
            }
        } catch (Exception e) {
            log.error("JWT 인증 처리 중 오류 발생: {}", e.getMessage());
            // 인증 실패 시 SecurityContext 초기화
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 토큰 로깅 시 민감한 정보를 가립니다.
     *
     * @param token 원본 토큰
     * @return 마스킹된 토큰
     */
    private String maskToken(String token) {
        if (token == null || token.length() < 10) {
            return "[PROTECTED]";
        }
        return token.substring(0, 10) + "...";
    }
}
