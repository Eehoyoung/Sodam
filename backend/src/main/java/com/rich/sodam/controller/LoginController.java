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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.LocaleResolver;
import com.rich.sodam.security.annotation.PublicEndpoint;
import jakarta.validation.Valid;

import java.util.*;

/**
 * 로그인 관련 요청을 처리하는 컨트롤러
 */
@PublicEndpoint
@RestController
@Tag(name = "인증", description = "사용자 인증 관련 API")
public class LoginController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LoginController.class);

    private final KakaoAuthService kakaoAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenService tokenService;
    private final UserService userService;
    private final TokenStore redisService;
    private final RefreshTokenService refreshTokenService;
    private final MessageSource messageSource;
    private final LocaleResolver localeResolver;

    @Value("${spring.security.oauth2.client.registration.kakao.redirect-uri}")
    private String redirectUrl;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String clientId;

    public LoginController(KakaoAuthService kakaoAuthService, JwtTokenProvider jwtTokenProvider, TokenService tokenService, UserService userService, TokenStore redisService, RefreshTokenService refreshTokenService, MessageSource messageSource, LocaleResolver localeResolver) {
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> kakaoLogin(
            @RequestParam String code,
            @RequestParam(value = "state", required = false) String state,
            HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

        // W-3: CSRF 방어용 state 검증 (try 이전 — 입력 검증 실패는 400 으로 반환, 500 catch 우회).
        // 카카오 인가 요청 시 발급한 state 를 콜백에서 대조해야 한다.
        // TODO[보안]: 인가 시작 엔드포인트에서 state 를 세션/Redis 에 저장하고 여기서 1회성 대조·소비.
        //   현재는 인가 시작 흐름이 FE(카카오 SDK) 측에 있어 BE 가 발급 state 를 보관하지 않으므로
        //   존재성·형식 검증만 수행. 운영 강화 시 PKCE 또는 BE 주도 state 발급으로 전환 필요.
        if (state == null || state.isBlank()) {
            // state 부재는 (구 클라이언트 호환 위해) 경고 후 진행. 운영 강화 시 state 강제 권장.
            log.warn("카카오 콜백 state 누락 — CSRF 검증 생략됨(현 흐름 한계). 운영에서 state 강제 권장.");
        } else if (!isValidStateFormat(state)) {
            // 정상 OAuth state 는 항상 잘 정의된 토큰이다. 형식이 비정상인 state 가 "존재"하면
            // 위변조·주입 시도로 간주하고 차단한다(경고만 하던 것을 거부로 강화).
            log.warn("카카오 콜백 state 형식 비정상 — 위변조 의심으로 차단. stateLen={}", state.length());
            String invalidMessage = messageSource.getMessage("auth.kakao.failed",
                    new Object[]{"invalid state"}, locale);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(ErrorCode.KAKAO_AUTH_ERROR.getCode(), invalidMessage));
        }

        try {
            // W-3: 인증 코드는 PII/시크릿에 준해 평문 로깅 금지 — 앞 4자리만 노출하고 나머지 마스킹.
            log.info("카카오 인증 코드 수신: {}", maskCode(code));

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
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Valid @RequestBody Login login, HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

        try {
            Optional<User> authenticationUser = userService.loadUserByLoginId(login.getEmail(), login.getPassword());

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
                result.put("name", authenticationUser.get().getName());
                result.put("phone", authenticationUser.get().getPhone());
                // FE 가 false 면 ProfileBasics 화면으로 강제 진입 (회원가입 후 1회성 보강)
                result.put("profileCompleted", authenticationUser.get().isProfileCompleted());

                String successMessage = messageSource.getMessage("auth.login.success", null, locale);
                return ResponseEntity.ok(ApiResponse.success(successMessage, result));
            }
            String failedMessage = messageSource.getMessage("auth.login.failed", null, locale);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(ErrorCode.UNAUTHORIZED.getCode(), failedMessage));
        } catch (IllegalArgumentException e) {
            String failedMessage = messageSource.getMessage("auth.login.failed", null, locale);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(ErrorCode.UNAUTHORIZED.getCode(), failedMessage));
        } catch (Exception e) {
            log.error("사용자 로그인 실패 {}", e.getMessage(), e);

            String errorMessage = messageSource.getMessage("auth.login.error", new Object[]{e.getMessage()}, locale);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), errorMessage));
        }
    }

    /** 이메일 사용 가능 여부 — 가입 폼 blur 시 실시간 체크. 인증 불필요. */
    @PublicEndpoint
    @GetMapping("/api/auth/email-check")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> emailCheck(@RequestParam String email) {
        boolean available = userService.isEmailAvailable(email);
        return ResponseEntity.ok(ApiResponse.success(Map.of("available", available)));
    }

    @PostMapping("/api/join")
    public ResponseEntity<ApiResponse<Object>> join(@Valid @RequestBody JoinDto join, HttpServletResponse response, HttpServletRequest request) {
        Locale locale = localeResolver.resolveLocale(request);

        // 선택적 역할/목적 헤더 로깅 (백엔드 미지원 시에도 안전)
        String purposeHeader = request.getHeader("X-User-Purpose");
        String gradeHeader = request.getHeader("X-User-Grade");
        if (purposeHeader != null || gradeHeader != null) {
            log.info("회원가입 요청 메타데이터 - X-User-Purpose: {}, X-User-Grade: {}", purposeHeader, gradeHeader);
        }

        userService.joinUser(join, request.getHeader("X-User-Grade"));
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
    public ResponseEntity<ApiResponse<Map<String, Object>>> refreshToken(@Valid @RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
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

    /**
     * 로그아웃 — refresh token 무효화 + Redis access 토큰 삭제.
     * JWT access 토큰 자체는 stateless 라 BE 가 강제 폐기 불가 (짧은 만료 1시간으로 완화).
     * FE 는 호출 후 로컬 토큰 clear — BE 호출 실패해도 로컬은 무조건 정리.
     */
    @Operation(summary = "로그아웃", description = "refresh token 을 무효화하고 Redis access 토큰을 삭제합니다.")
    @PostMapping({"/api/auth/logout", "/api/logout"})
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletRequest httpRequest) {
        try {
            String token = jwtTokenProvider.resolveToken(httpRequest);
            if (token != null && jwtTokenProvider.validateToken(token)) {
                Long userId = jwtTokenProvider.getUserId(token);
                userService.findById(userId).ifPresent(refreshTokenService::invalidateUserTokens);
                redisService.deleteToken(String.valueOf(userId), token);
            }
            return ResponseEntity.ok(ApiResponse.success("로그아웃됐어요."));
        } catch (Exception e) {
            log.warn("로그아웃 처리 중 예외 (로컬은 정리 권장): {}", e.getMessage());
            // 200 반환 — 클라이언트가 로컬 세션을 끊을 수 있게 막지 않음.
            return ResponseEntity.ok(ApiResponse.success("로그아웃됐어요."));
        }
    }

    /**
     * 현재 로그인한 사용자 정보 조회
     * Authorization: Bearer <access>
     * 응답: { id, email, name, roles: [ ... ] }
     */
    @Operation(summary = "내 정보", description = "현재 로그인한 사용자의 프로필을 반환합니다.")
    @GetMapping({"/api/auth/me", "/api/me"})
    public ResponseEntity<Map<String, Object>> getCurrentUser(HttpServletRequest httpRequest) {
        try {
            String token = jwtTokenProvider.resolveToken(httpRequest);
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Long authUserId = jwtTokenProvider.getUserId(token);
            Optional<User> userOpt = userService.findById(authUserId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            User user = userOpt.get();
            Map<String, Object> body = new HashMap<>();
            body.put("id", user.getId());
            body.put("email", user.getEmail());
            body.put("name", user.getName());
            body.put("role", user.getUserGrade());
            body.put("phone", user.getPhone());
            body.put("birthDate", user.getBirthDate());
            // FE 가 false 면 ProfileBasics 화면으로 강제 진입 (자동 로그인 후에도 일관 보장)
            body.put("profileCompleted", user.isProfileCompleted());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("현재 사용자 정보 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 카카오 인증 코드 로그 마스킹 — 앞 4자리만 노출하고 나머지는 '*'.
     * 인증 코드는 짧은 시간 유효한 1회성 시크릿이므로 평문 로깅 금지.
     */
    private String maskCode(String code) {
        if (code == null || code.isBlank()) {
            return "(empty)";
        }
        int visible = Math.min(4, code.length());
        return code.substring(0, visible) + "****";
    }

    /**
     * state 형식 1차 검증 — 길이/문자셋 기본 가드.
     * (완전한 CSRF 방어는 발급 state 와의 대조가 필요 — 위 TODO 참고.)
     */
    private boolean isValidStateFormat(String state) {
        // 통상 state 는 영숫자/하이픈/언더스코어로 구성된 16~256자 토큰.
        return state.matches("[A-Za-z0-9_\\-]{8,256}");
    }
}
