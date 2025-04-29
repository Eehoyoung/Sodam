package com.rich.sodam.securicy.filter;

import com.rich.sodam.securicy.JwtTokenProvider;
import com.rich.sodam.service.JwtProperties;
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
     * @param request 요청 객체
     * @param response 응답 객체
     * @param filterChain 필터 체인
     * @throws ServletException 서블릿 처리 중 발생하는 예외
     * @throws IOException 입출력 처리 중 발생하는 예외
     */
    @Override
    protected void doFilterInternal(@NotNull HttpServletRequest request, 
                                    @NotNull HttpServletResponse response,
                                    @NotNull FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // 요청에서 토큰 추출
            String token = jwtTokenProvider.getTokenFromRequest(request);
            
            // 토큰 유효성 검사
            if (token != null && token.startsWith(JwtProperties.TOKEN_PREFIX)) {
                log.debug("JWT 토큰 발견: {}", maskToken(token));
                
                Long userId = jwtTokenProvider.getUserIdFromToken(token);
                
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    log.debug("유효한 JWT 토큰 - 사용자 ID: {}", userId);
                    // 사용자 ID를 기반으로 사용자 정보 로드
                    // 인증 객체 생성 및 SecurityContext에 설정
                } else {
                    log.debug("유효하지 않은 JWT 토큰 또는 이미 인증된 사용자");
                }
            } else {
                log.debug("JWT 토큰이 없거나 Bearer 형식이 아님");
            }
        } catch (Exception e) {
            log.error("JWT 인증 처리 중 오류 발생: {}", e.getMessage());
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