package com.rich.sodam.controller;

import com.rich.sodam.domain.RefreshToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.JoinDto;
import com.rich.sodam.dto.request.Login;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.exception.ErrorCode;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.LocaleResolver;

import java.util.HashMap;
import java.util.Locale;
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
    private final RefreshTokenService refreshTokenService;
    private final MessageSource messageSource;
    private final LocaleResolver localeResolver;

    @Value("${spring.security.oauth2.client.registration.kakao.redirect-uri}")
    private String redirectUrl;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String clientId;

    public LoginController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider, TokenService tokenService, UserService userService, RedisService redisService, RefreshTokenService refreshTokenService, MessageSource messageSource, LocaleResolver localeResolver) {
        this.kakaoAuthService = kakaoAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.tokenService = tokenService;
        this.userService = userService;
        this.redisService = redisService;
        this.refreshTokenService = refreshTokenService;
        this.messageSource = messageSource;
        this.localeResolver = localeResolver;
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> kakaoLogin(@RequestParam String code, HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

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
            // 리프레시 토큰 생성
            var refreshToken = refreshTokenService.createRefreshToken(authenticationUser);
            // Redis 토큰 저장 (액세스 토큰 만료 시간을 15분으로 연장)
            redisService.saveToken(authenticationUser.getId(), jwtToken, 900); // 15분
            // 쿠키 생성 및 설정
            Cookie jwtCookie = tokenService.createJwtCookie(authenticationUser, jwtToken);
            response.addCookie(jwtCookie);

            // 성공 응답 생성
            Map<String, Object> result = new HashMap<>();
            result.put("redirectUrl", "/index.html");
            result.put("userGrade", authenticationUser.getUserGrade().getValue());
            result.put("accessToken", jwtToken); // 액세스 토큰
            result.put("refreshToken", refreshToken.getToken()); // 리프레시 토큰
            result.put("userId", authenticationUser.getId()); // 사용자 ID

            log.info("카카오 로그인 성공: {}", authenticationUser.getEmail());
            String successMessage = messageSource.getMessage("auth.kakao.success", null, locale);
            return ResponseEntity.ok(ApiResponse.success(successMessage, result));
        } catch (Exception e) {
            log.error("카카오 인증 실패: {}", e.getMessage(), e);

            String errorMessage = messageSource.getMessage("auth.kakao.failed", new Object[]{e.getMessage()}, locale);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(ErrorCode.KAKAO_AUTH_ERROR.getCode(), errorMessage));
        }
    }

    @PostMapping("/api/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@RequestBody Login login, HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

        try {
            Optional<User> authenticationUser = Optional.ofNullable(userService.loadUserByLoginId(login.getEmail(), login.getPassword()).orElseThrow(
                    () -> new RuntimeException(messageSource.getMessage("auth.user.not.found", null, locale))
            ));

            if (authenticationUser.isPresent()) {
                final String jwtToken = jwtTokenProvider.createToken(authenticationUser.get());
                // 리프레시 토큰 생성
                var refreshToken = refreshTokenService.createRefreshToken(authenticationUser.get());

                Cookie jwtCookie = tokenService.createJwtCookie(authenticationUser.get(), jwtToken);

                // Redis 토큰 저장 (액세스 토큰 만료 시간을 15분으로 연장)
                redisService.saveToken(authenticationUser.get().getId(), jwtToken, 900); // 15분

                response.addCookie(jwtCookie);

                // 모바일 클라이언트를 위해 응답 본문에 토큰과 사용자 정보 포함
                Map<String, Object> result = new HashMap<>();
                result.put("accessToken", jwtToken);
                result.put("refreshToken", refreshToken.getToken());
                result.put("userId", authenticationUser.get().getId());
                result.put("userGrade", authenticationUser.get().getUserGrade().getValue());

                String successMessage = messageSource.getMessage("auth.login.success", null, locale);
                return ResponseEntity.ok(ApiResponse.success(successMessage, result));
            }
            String failedMessage = messageSource.getMessage("auth.login.failed", null, locale);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(ErrorCode.UNAUTHORIZED.getCode(), failedMessage));
        } catch (Exception e) {
            log.error("사용자 로그인 실패 {}", e.getMessage(), e);

            String errorMessage = messageSource.getMessage("auth.login.error", new Object[]{e.getMessage()}, locale);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), errorMessage));
        }
    }

    @PostMapping("/api/join")
    public ResponseEntity<ApiResponse<Object>> join(@RequestBody JoinDto join, HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

        userService.joinUser(join);
        String successMessage = messageSource.getMessage("auth.join.success", null, locale);
        return ResponseEntity.ok(ApiResponse.success(successMessage));
    }

    /**
     * 리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급합니다.
     *
     * @param request HTTP 요청 객체
     * @return 새로운 토큰 정보를 담은 ResponseEntity
     */
    @Operation(summary = "토큰 갱신", description = "리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급합니다.")
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refreshToken(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        Locale locale = localeResolver.resolveLocale(httpRequest);

        try {
            String refreshTokenValue = request.get("refreshToken");
            if (refreshTokenValue == null || refreshTokenValue.trim().isEmpty()) {
                String errorMessage = messageSource.getMessage("auth.refresh.token.required", null, locale);
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(ErrorCode.REFRESH_TOKEN_REQUIRED.getCode(), errorMessage));
            }

            // 리프레시 토큰 조회 및 검증
            Optional<RefreshToken> refreshTokenOpt = refreshTokenService.findByToken(refreshTokenValue);
            if (refreshTokenOpt.isEmpty()) {
                String errorMessage = messageSource.getMessage("auth.refresh.token.invalid", null, locale);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(ErrorCode.REFRESH_TOKEN_INVALID.getCode(), errorMessage));
            }

            RefreshToken refreshToken = refreshTokenOpt.get();
            if (!refreshTokenService.validateRefreshToken(refreshToken)) {
                String errorMessage = messageSource.getMessage("auth.refresh.token.expired", null, locale);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(ErrorCode.REFRESH_TOKEN_EXPIRED.getCode(), errorMessage));
            }

            // 기존 리프레시 토큰 사용 처리
            refreshTokenService.markTokenAsUsed(refreshToken);

            // 새로운 토큰들 생성
            User user = refreshToken.getUser();
            String newAccessToken = jwtTokenProvider.createToken(user);
            RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

            // Redis에 새 액세스 토큰 저장
            redisService.saveToken(user.getId(), newAccessToken, 900); // 15분

            // 응답 생성
            Map<String, Object> result = new HashMap<>();
            result.put("accessToken", newAccessToken);
            result.put("refreshToken", newRefreshToken.getToken());
            result.put("userId", user.getId());
            result.put("userGrade", user.getUserGrade().getValue());

            log.info("토큰 갱신 성공 - 사용자 ID: {}", user.getId());
            String successMessage = messageSource.getMessage("auth.refresh.success", null, locale);
            return ResponseEntity.ok(ApiResponse.success(successMessage, result));

        } catch (Exception e) {
            log.error("토큰 갱신 실패: {}", e.getMessage(), e);
            String errorMessage = messageSource.getMessage("auth.refresh.error", new Object[]{e.getMessage()}, locale);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), errorMessage));
        }
    }
}
