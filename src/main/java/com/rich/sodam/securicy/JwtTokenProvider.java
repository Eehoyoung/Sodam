package com.rich.sodam.securicy;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.rich.sodam.domain.User;
import com.rich.sodam.service.JwtProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Date;

/**
 * JWT 토큰 생성 및 검증을 담당하는 컴포넌트
 */
@Component
public class JwtTokenProvider {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtTokenProvider.class);

    /**
     * HTTP 요청에서 JWT 토큰을 추출합니다.
     *
     * @param request HTTP 요청 객체
     * @return JWT 토큰 문자열 또는 null
     */
    public String getTokenFromRequest(HttpServletRequest request) {
        String jwtHeader = null;
        Cookie[] cookies = request.getCookies();

        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (JwtProperties.HEADER_STRING.equals(cookie.getName())) {
                    jwtHeader = cookie.getValue();
                    break;
                }
            }
        }

        return jwtHeader;
    }

    /**
     * JWT 토큰에서 사용자 ID를 추출합니다.
     *
     * @param token JWT 토큰 문자열
     * @return 사용자 ID 또는 토큰이 유효하지 않은 경우 null
     */
    public Long getUserIdFromToken(String token) {
        try {
            return JWT.require(Algorithm.HMAC512(JwtProperties.SECRET))
                    .build()
                    .verify(token.replace(JwtProperties.TOKEN_PREFIX, "").trim())
                    .getClaim("id")
                    .asLong();
        } catch (JWTVerificationException e) {
            log.warn("JWT 토큰 검증 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 사용자 정보를 바탕으로 JWT 토큰을 생성합니다.
     *
     * @param user 사용자 객체
     * @return 생성된 JWT 토큰 문자열
     */
    public String createToken(User user) {
        String token = JWT.create()
                .withSubject(user.getEmail())
                .withExpiresAt(new Date(System.currentTimeMillis() + JwtProperties.EXPIRATION_TIME))
                .withClaim("id", user.getId())
                .withClaim("nickname", user.getName())
                .sign(Algorithm.HMAC512(JwtProperties.SECRET));

        log.debug("JWT 토큰 생성 완료: 사용자 ID {}", user.getId());
        return token;
    }
}