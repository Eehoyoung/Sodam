package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.security.JwtTokenProvider;
import com.rich.sodam.service.KakaoAuthService;
import com.rich.sodam.service.TokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.HashMap;
import java.util.Map;

/**
 * 로그인 관련 요청을 처리하는 컨트롤러
 */
@Controller
public class LoginController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LoginController.class);

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenService tokenService;

    @Value("${spring.security.oauth2.client.registration.kakao.redirect-uri}")
    private String redirectUrl;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String clientId;

    public LoginController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider, TokenService tokenService) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenService = tokenService;
    }

    /**
     * 카카오 인증 처리 엔드포인트
     *
     * @param code     카카오 인증 코드
     * @param response HTTP 응답 객체
     * @return 인증 결과를 담은 ResponseEntity
     */
    @GetMapping("/kakao/auth/proc")
    public ResponseEntity<Map<String, Object>> kakaoLogin(@RequestParam String code, HttpServletResponse response) {
        try {
            log.info("카카오 인증 코드 수신: {}", code);

            // 액세스 토큰 획득
            String accessToken = kakaoAuthService.getAccessToken(code, redirectUrl, clientId);
            log.debug("카카오 액세스 토큰 획득 성공");

            // 사용자 정보 획득
            User authenticationUser = kakaoAuthService.getAuthenticatedUser(accessToken);
            log.debug("사용자 인증 성공: {}", authenticationUser.getEmail());

            // JWT 토큰 생성
            String jwtToken = jwtTokenProvider.createToken(authenticationUser);

            // 쿠키 생성 및 설정
            Cookie jwtCookie = tokenService.createJwtCookie(authenticationUser, jwtToken);
            response.addCookie(jwtCookie);

            // 성공 응답 생성
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("redirectUrl", "/index.html");
            result.put("userGrade", authenticationUser.getUserGrade().getValue());

            log.info("카카오 로그인 성공: {}", authenticationUser.getEmail());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("카카오 인증 실패: {}", e.getMessage(), e);

            // 오류 응답 생성
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("message", "인증 실패: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
        }
    }
}
