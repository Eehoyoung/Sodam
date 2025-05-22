package com.rich.sodam.service;

import com.rich.sodam.domain.User;
import jakarta.servlet.http.Cookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 토큰 관련 서비스 클래스
 * JWT 토큰의 쿠키 생성 및 관리를 담당합니다.
 */
@Service
public class TokenService {

    @Value("${jwt.cookie-name}")
    private String jwtCookieName;

    @Value("${jwt.cookie-max-age}")
    private int cookieMaxAge;

    /**
     * JWT 토큰을 저장하는 쿠키를 생성합니다.
     *
     * @param user 사용자 엔티티
     * @param jwtToken JWT 토큰
     * @return 생성된 쿠키
     */
    public Cookie createJwtCookie(User user, String jwtToken) {
        Cookie jwtCookie = new Cookie(jwtCookieName, jwtToken);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(true); // HTTPS에서만 전송
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(cookieMaxAge);
        return jwtCookie;
    }

    /**
     * 로그아웃용 만료된 쿠키를 생성합니다.
     *
     * @return 만료된 쿠키
     */
    public Cookie createLogoutCookie() {
        Cookie jwtCookie = new Cookie(jwtCookieName, null);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setSecure(true);
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(0); // 쿠키 즉시 만료
        return jwtCookie;
    }
}