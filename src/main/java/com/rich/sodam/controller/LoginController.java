package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.dto.request.Login;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.service.KakaoAuthService;
import com.rich.sodam.service.RedisService;
import com.rich.sodam.service.TokenService;
import com.rich.sodam.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 로그인 관련 요청을 처리하는 컨트롤러
 */
@Controller
@Tag(name = "인증", description = "사용자 인증 관련 API")
public class LoginController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LoginController.class);

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenService tokenService;
    private final UserService userService;
    private final RedisService redisService;

    @Value("${spring.security.oauth2.client.registration.kakao.redirect-uri}")
    private String redirectUrl;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String clientId;

    public LoginController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider, TokenService tokenService, UserService userService, RedisService redisService) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenService = tokenService;
        this.userService = userService;
        this.redisService = redisService;
    }

    /**
     * 카카오 인증 처리 엔드포인트
     *
     * @param code     카카오 인증 코드
     * @param response HTTP 응답 객체
     * @return 인증 결과를 담은 ResponseEntity
     */
    @Operation(summary = "카카오 로그인 처리", description = "카카오 OAuth 인증 코드를 처리하여 사용자를 인증합니다.")
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
            // Redis 토큰 저장
            redisService.saveToken(authenticationUser.getId(), jwtToken, 600);
            // 쿠키 생성 및 설정
            Cookie jwtCookie = tokenService.createJwtCookie(authenticationUser, jwtToken);
            response.addCookie(jwtCookie);

            // 성공 응답 생성
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("redirectUrl", "/index.html");
            result.put("userGrade", authenticationUser.getUserGrade().getValue());
            result.put("token", jwtToken); // JWT 토큰을 응답 본문에 포함 (모바일 클라이언트용)
            result.put("userId", authenticationUser.getId()); // 사용자 ID도 포함

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

    @PostMapping("/api/login")
    public ResponseEntity<?> login(@RequestBody Login login, HttpServletResponse response) {
        Optional<User> authenticationUser = Optional.ofNullable(userService.loadUserByLoginId(login.getEmail(), login.getPassword()).orElseThrow(
                () -> new RuntimeException("사용자를 찾을 수 없습니다.")
        ));

        try {
            if (authenticationUser.isPresent()) {
                final String jwtToken = jwtTokenProvider.createToken(authenticationUser.get());


                Cookie jwtCookie = tokenService.createJwtCookie(authenticationUser.get(), jwtToken);

                redisService.saveToken(authenticationUser.get().getId(), jwtToken, 600);

                response.addCookie(jwtCookie);

                // 모바일 클라이언트를 위해 응답 본문에 토큰과 사용자 정보 포함
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("token", jwtToken);
                result.put("userId", authenticationUser.get().getId());
                result.put("userGrade", authenticationUser.get().getUserGrade().getValue());

                return ResponseEntity.ok(result);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("<UNK> <UNK> <UNK>.");
        } catch (Exception e) {
            log.error("사용자 로그인 실패 {}", e.getMessage(), e);

            // 오류 응답 생성
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("success", false);
            errorResult.put("message", "인증 실패: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResult);
        }
    }

    @PostMapping("/api/join")
    public ResponseEntity<?> join(@RequestBody JoinDto join, HttpServletResponse response) {
        userService.joinUser(join);
        return ResponseEntity.ok("<UNK> <UNK> <UNK>.");
    }
}
