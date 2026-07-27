package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.Login;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.web.SodamCsrfFilter;
import com.rich.sodam.service.UserService;
import com.rich.sodam.service.webauth.LoginLockoutService;
import com.rich.sodam.service.webauth.WebLoginAccountRateLimiter;
import com.rich.sodam.exception.WebLoginRateLimitExceededException;
import com.rich.sodam.security.annotation.PublicEndpoint;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 사장님 웹 콘솔(Phase 0) 전용 세션 인증 — docs/260726/01_시스템아키텍처.md §4, 04_보안정책.md.
 *
 * <p>비밀번호 검증은 기존 {@link UserService#loadUserByLoginId(String, String)} 를 그대로
 * 재사용한다(중복 구현 금지, 기존 {@code POST /api/login} 과 동일 검증 경로).
 * 성공 시 기존 JWT 인증 경로와 동일한 {@link UserPrincipal} 구조를 세션 {@link SecurityContext} 에
 * 심어 {@code StoreAccessGuard}/{@code @EmployeeOrMaster}/{@code @MasterOnly} 등 기존 인가 로직을
 * 변경 없이 그대로 재사용한다 — 세션 principal 에 storeId 를 별도로 넣거나 새 인가 로직을 만들지 않는다.
 */
@Slf4j
@RestController
@RequestMapping("/api/web/auth")
@Tag(name = "웹 콘솔 인증", description = "사장님 웹 콘솔 전용 세션 기반 인증 API")
public class WebAuthController {

    private final UserService userService;
    private final LoginLockoutService loginLockoutService;
    private final WebLoginAccountRateLimiter accountRateLimiter;
    private final SecurityContextRepository securityContextRepository;

    @Value("${sodam.session.cookie.secure:true}")
    private boolean cookieSecure;

    private static final String CSRF_COOKIE_NAME = "sodam_web_csrf";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public WebAuthController(UserService userService,
                              LoginLockoutService loginLockoutService,
                              WebLoginAccountRateLimiter accountRateLimiter,
                              SecurityContextRepository securityContextRepository) {
        this.userService = userService;
        this.loginLockoutService = loginLockoutService;
        this.accountRateLimiter = accountRateLimiter;
        this.securityContextRepository = securityContextRepository;
    }

    @PublicEndpoint
    @Operation(summary = "웹 콘솔 로그인", description = "이메일/비밀번호 검증 후 세션을 생성합니다(JWT 미발급).")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody Login login, HttpServletRequest request, HttpServletResponse response) {

        String accountKey = normalize(login.getEmail());

        // 가드성 검증은 항상 try 밖 — 계정 잠금·rate limit 은 인가 실패에 준하는 조기 차단.
        loginLockoutService.assertNotLocked(accountKey);
        if (!accountRateLimiter.tryConsume(accountKey)) {
            throw new WebLoginRateLimitExceededException();
        }

        Optional<User> userOpt = userService.loadUserByLoginId(login.getEmail(), login.getPassword());
        if (userOpt.isEmpty()) {
            loginLockoutService.recordFailure(accountKey);
            log.warn("웹 콘솔 로그인 실패 - accountKey={}", maskEmail(accountKey));
            throw new BadCredentialsException("이메일 또는 비밀번호가 올바르지 않아요.");
        }
        loginLockoutService.recordSuccess(accountKey);

        // 세션 고정(Session Fixation) 방어 — 이 로그인은 Spring Security 표준 인증 필터체인을
        // 거치지 않고 컨트롤러에서 직접 SecurityContext 를 구성하므로, 표준 필터가 자동 적용하는
        // ChangeSessionIdAuthenticationStrategy(로그인 시 세션ID 재발급)가 여기선 동작하지 않는다.
        // 로그인 이전에 이미 발급된 세션이 있다면(공격자가 심어둔 값일 수 있음) 무효화하고 완전히
        // 새 세션을 발급해, 인증 전/후 세션ID가 절대 같지 않도록 강제한다.
        HttpSession existingSession = request.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        User user = userOpt.get();
        UserPrincipal principal = UserPrincipal.create(user);
        Authentication authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession session = request.getSession(true);
        // 표준 HttpSessionSecurityContextRepository 로 세션에 영속화 — 커스텀 직렬화 없음.
        securityContextRepository.saveContext(context, request, response);

        String csrfToken = issueCsrfToken(session, response);

        log.info("웹 콘솔 로그인 성공 - userId={}, userGrade={}", user.getId(), user.getUserGrade());

        Map<String, Object> result = new HashMap<>();
        result.put("userId", user.getId());
        result.put("userGrade", user.getUserGrade().getValue());
        result.put("name", user.getName());
        // FE 가 최초 렌더에서 헤더에 바로 실을 수 있도록 바디에도 포함(쿠키는 JS 로 읽을 수 있으나
        // 소량의 편의 제공 목적 — 신뢰 경계는 항상 서버측 비교임).
        result.put("csrfToken", csrfToken);
        return ResponseEntity.ok(ApiResponse.success("로그인됐어요.", result));
    }

    @Operation(summary = "웹 콘솔 로그아웃", description = "현재 세션을 무효화합니다.")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        expireCsrfCookie(response);
        return ResponseEntity.ok(ApiResponse.success("로그아웃됐어요."));
    }

    @Operation(summary = "웹 콘솔 내 정보", description = "세션 인증된 현재 사용자 정보를 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal principal) {
        // 세션이 없거나 만료된 요청은 이 메서드 진입 전에 webSessionFilterChain 의
        // authorizeHttpRequests(anyRequest().authenticated()) 가 이미 401 로 차단한다.
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> userOpt = userService.findById(principal.getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userOpt.get();
        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("email", user.getEmail());
        body.put("name", user.getName());
        body.put("userGrade", user.getUserGrade().getValue());
        return ResponseEntity.ok(body);
    }

    private String issueCsrfToken(HttpSession session, HttpServletResponse response) {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        session.setAttribute(SodamCsrfFilter.CSRF_SESSION_ATTR, token);
        // JS 가 읽어야 하므로 HttpOnly 아님(Double Submit Cookie). SameSite 등 확장 속성은
        // jakarta.servlet.http.Cookie#setAttribute + response.addCookie() 조합이 서블릿 컨테이너별로
        // 일관되게 직렬화되지 않아(예: MockHttpServletResponse 는 attributes 맵을 무시) 원시 Set-Cookie
        // 헤더를 직접 조립한다 — Spring Session 의 DefaultCookieSerializer 와 동일한 접근.
        response.addHeader("Set-Cookie", buildCookieHeader(token, null));
        return token;
    }

    private void expireCsrfCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", buildCookieHeader("", 0));
    }

    private String buildCookieHeader(String value, Integer maxAgeSeconds) {
        StringBuilder sb = new StringBuilder();
        sb.append(CSRF_COOKIE_NAME).append('=').append(value)
                .append("; Path=/")
                .append("; SameSite=Strict");
        if (maxAgeSeconds != null) {
            sb.append("; Max-Age=").append(maxAgeSeconds);
        }
        if (cookieSecure) {
            sb.append("; Secure");
        }
        return sb.toString();
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "(empty)";
        }
        int at = email.indexOf('@');
        if (at <= 1) {
            return "*".repeat(email.length());
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
