package com.rich.sodam.config;

import com.rich.sodam.jwt.JwtAuthenticationEntryPoint;
import com.rich.sodam.jwt.JwtAuthenticationFilter;
import com.rich.sodam.jwt.JwtTokenProvider;
import lombok.Getter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 설정을 담당하는 구성 클래스
 */
@Getter
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SecurityConfig.class);

    private final JwtTokenProvider jwtTokenProvider;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider,
                          JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Spring Security 필터 체인 구성을 정의합니다.
     *
     * @param http HttpSecurity 객체
     * @return 구성된 SecurityFilterChain
     * @throws Exception 보안 설정 중 발생할 수 있는 예외
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("Spring Security 필터 체인 구성 중...");

        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/swagger-ui/**", "/api-docs/**", "/v3/api-docs/**",
                                "/swagger-ui.html", "/webjars/**",
                                "/actuator/health", "/actuator/info",
                                "/api/join", "/api/login",
                                "/kakao/auth/proc", "/api/auth/refresh",
                                "/api/auth/password-reset/**",
                                // 결제 웹훅: 자체 HMAC 서명 검증으로 보호 — 인증 헤더 없이 진입 허용
                                "/api/billing/webhook/**",
                                // 정적 콘텐츠 페이지: 비인증 조회 허용 (앱 첫 화면용)
                                "/api/info/**",
                                // H2 콘솔 (dev 프로필에서만 노출됨)
                                "/h2-console/**",
                                // 플랜 카탈로그: 비인증 조회 허용
                                "/api/billing/plans",
                                // WebSocket 핸드셰이크: HTTP 업그레이드는 허용하고, 실제 인증은
                                // STOMP CONNECT 단계에서 JWT 로 강제(WebSocketConfig 채널 인터셉터).
                                "/ws/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configure(http))
                .headers(headers -> headers
                        // H2 콘솔 iframe 허용 (dev)
                        .frameOptions(frame -> frame.sameOrigin())
                        .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31_536_000))
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 인증 실패(토큰 만료·무효·누락)는 401 로 응답해야 FE 의 토큰 자동 갱신(401 트리거)이 동작한다.
                // 미등록 시 Spring 기본 Http403ForbiddenEntryPoint 가 403 을 반환 → FE refresh 가 안 돌아
                // 세션 만료 후 모든 화면이 403 으로 막혔다.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        log.info("Spring Security 필터 체인 구성 완료");
        return http.build();
    }

    /*
      JWT 인증 필터 빈을 생성합니다.

      @return JwtAuthenticationFilter 인스턴스
     */
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        log.debug("JWT 인증 필터 생성");
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }
}
