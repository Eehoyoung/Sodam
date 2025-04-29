package com.rich.sodam.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.rich.sodam.domain.User;
import com.rich.sodam.securicy.JwtTokenProvider;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * JWT 토큰 관리를 위한 서비스 클래스
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userService;

    /**
     * 토큰 페이로드에서 사용자 ID를 추출합니다.
     *
     * @param payloadStr JWT 페이로드 문자열
     * @return 사용자 ID (Long)
     */
    public Long getUserIdFromToken(String payloadStr) {
        JsonObject jsonObject = new Gson().fromJson(payloadStr, JsonObject.class);
        return jsonObject.get("id").getAsLong();
    }

    /**
     * 토큰 페이로드에서 만료 일자를 추출합니다.
     *
     * @param payloadStr JWT 페이로드 문자열
     * @return 만료 일자 (Date)
     */
    public Date getDateExpFromToken(String payloadStr) {
        JsonObject jsonObject = new Gson().fromJson(payloadStr, JsonObject.class);
        long exp = jsonObject.get("exp").getAsLong();
        return new Date(exp * 1000);
    }

    /**
     * 지정된 이름의 쿠키를 삭제합니다.
     *
     * @param cookieName 삭제할 쿠키 이름
     * @param request    HTTP 요청 객체
     * @param response   HTTP 응답 객체
     */
    public void clearCookie(String cookieName, HttpServletRequest request, HttpServletResponse response) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(cookieName)) {
                    cookie.setMaxAge(0); // 쿠키 만료 시간을 0으로 설정하여 삭제
                    cookie.setHttpOnly(true); // 보안을 위한 HttpOnly 설정
                    cookie.setPath("/");
                    response.addCookie(cookie);
                    break;
                }
            }
        }
    }

    /**
     * 인증된 사용자를 위한 JWT 쿠키를 생성합니다.
     *
     * @param authenticatedUser 인증된 사용자 객체
     * @param jwtToken          JWT 토큰 문자열
     * @return 생성된 JWT 쿠키
     */
    public Cookie createJwtCookie(@NotNull User authenticatedUser, String jwtToken) {
        UserDetails userDetails = this.userService.loadUserByUsername(authenticatedUser.getEmail());
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        jwtToken = JwtProperties.TOKEN_PREFIX.trim() + jwtToken;
        Cookie jwtCookie = new Cookie(JwtProperties.HEADER_STRING, jwtToken);
        jwtCookie.setHttpOnly(true);
        jwtCookie.setMaxAge(JwtProperties.EXPIRATION_TIME / 1000); // 밀리초를 초로 변환
        jwtCookie.setPath("/");

        return jwtCookie;
    }
}