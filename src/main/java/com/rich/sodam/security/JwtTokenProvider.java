package com.rich.sodam.security;

import com.rich.sodam.domain.User;
import com.rich.sodam.exception.InvalidTokenException;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 토큰 생성 및 검증을 처리하는 유틸리티 클래스
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final UserDetailsService userDetailsService;
    @Value("${jwt.secret}")
    private String secretKey;
    @Value("${jwt.token-validity-in-seconds}")
    private long tokenValidityInSeconds;
    private Key key;

    public JwtTokenProvider(UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @PostConstruct
    public void init() {
        byte[] keyBytes = secretKey.getBytes();
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * 사용자 정보를 기반으로 JWT 토큰을 생성합니다.
     *
     * @param user 사용자 엔티티
     * @return 생성된 JWT 토큰
     */
    public String createToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("email", user.getEmail());
        claims.put("id", user.getId());
        claims.put("userGrade", user.getUserGrade().getValue());

        long now = System.currentTimeMillis();
        Date validity = new Date(now + tokenValidityInSeconds * 1000);

        return Jwts.builder().claims(claims).subject(user.getEmail()).issuedAt(new Date(now)).expiration(validity)
                .signWith(key)
                .compact();
    }

    /**
     * JWT 토큰에서 사용자 인증 정보를 추출합니다.
     *
     * @param token JWT 토큰
     * @return 사용자 인증 객체
     */
    public Authentication getAuthentication(String token) {
        Claims claims = extractClaims(token);
        String userEmail = claims.getSubject();

        UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
        return new UsernamePasswordAuthenticationToken(userDetails, "", userDetails.getAuthorities());
    }

    /**
     * JWT 토큰에서 사용자 ID를 추출합니다.
     *
     * @param token JWT 토큰
     * @return 사용자 ID
     */
    public Long getUserId(String token) {
        Claims claims = extractClaims(token);
        return claims.get("id", Long.class);
    }

    /**
     * JWT 토큰의 유효성을 검증합니다.
     *
     * @param token JWT 토큰
     * @return 유효성 여부
     */
    public boolean validateToken(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    /**
     * JWT 토큰에서 클레임 정보를 추출합니다.
     *
     * @param token JWT 토큰
     * @return 클레임 정보
     * @throws InvalidTokenException 토큰이 유효하지 않은 경우
     */
    private Claims extractClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith((SecretKey) key)
                    .build().parseSignedClaims(token).getPayload();

        } catch (ExpiredJwtException e) {
            throw new InvalidTokenException("만료된 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            throw new InvalidTokenException("지원되지 않는 토큰 형식입니다.");
        } catch (MalformedJwtException e) {
            throw new InvalidTokenException("잘못된 형식의 토큰입니다.");
        } catch (SignatureException e) {
            throw new InvalidTokenException("유효하지 않은 토큰 서명입니다.");
        } catch (IllegalArgumentException e) {
            throw new InvalidTokenException("토큰이 비어있습니다.");
        }
    }

    public String resolveToken(HttpServletRequest req) {
        if (req.getHeader("Authorization") != null) {
            return req.getHeader("Authorization");
        }
        return null;
    }
}