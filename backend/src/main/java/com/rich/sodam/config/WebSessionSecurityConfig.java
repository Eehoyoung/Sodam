package com.rich.sodam.config;

import com.rich.sodam.jwt.JwtAuthenticationEntryPoint;
import com.rich.sodam.security.web.SessionAbsoluteExpiryFilter;
import com.rich.sodam.security.web.SodamCsrfFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.session.MapSessionRepository;
import org.springframework.session.config.annotation.web.http.EnableSpringHttpSession;
import org.springframework.session.data.redis.config.annotation.SpringSessionRedisConnectionFactory;
import org.springframework.session.web.http.CookieHttpSessionIdResolver;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.session.web.http.HttpSessionIdResolver;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 사장님 웹 콘솔(Phase 0) — 세션 기반 인증 배선.
 * docs/260726/01_시스템아키텍처.md §4, 04_보안정책.md, 07_배포_운영계획.md §2 를 따른다.
 *
 * <p><b>기존 {@link SecurityConfig}(모바일 JWT STATELESS 체인)는 이 클래스에서 전혀 참조·수정하지
 * 않는다</b> — 별도 {@link SecurityFilterChain} 빈을 {@code /api/web/**} 경로이거나 세션 쿠키가
 * 실려 있는 요청에만 매칭시켜({@code WEB_SESSION_REQUEST_MATCHER}) 두 체인이 충돌하지 않게 한다
 * ({@code @Order} 로 이 체인이 먼저 평가되도록 우선순위를 준다). 세션 쿠키가 없는 모바일 JWT 요청은
 * 이 체인에 매칭되지 않으므로 그대로 기존 체인이 처리한다.
 *
 * <p>Redis 인스턴스 분리: 세션은 캐시/JWT 와 물리적으로 분리된 Redis 인스턴스를 사용한다
 * (장애 격리 — 캐시 재시작/flush 가 로그인 세션에 영향을 주지 않게 하려는 목적).
 * dev/test 프로필은 실제 Redis 없이 Spring Session 의 {@link MapSessionRepository}(in-memory)로
 * 폴백한다 — CI 에 Redis 가 없어도 항상 부팅·테스트가 가능해야 한다.
 */
@Slf4j
@Configuration
public class WebSessionSecurityConfig {

    /** 세션 쿠키 이름 — 04_보안정책.md §1. */
    public static final String SESSION_COOKIE_NAME = "sodam_web_sid";

    /** 세션 절대 만료(12시간) — 유휴 30분 만료(세션 TTL)와 별개로 먼저 도달하는 조건 적용. */
    private static final Duration ABSOLUTE_SESSION_TTL = Duration.ofHours(12);

    @Value("${sodam.session.cookie.secure:true}")
    private boolean sessionCookieSecure;

    @Value("${sodam.session.timeout-minutes:30}")
    private int sessionTimeoutMinutes;

    @Value("${sodam.session.csrf.allowed-origins:http://localhost:3000}")
    private String csrfAllowedOriginsCsv;

    // =========================================================================================
    // Redis 세션 연결 팩토리 — prod 전용. dev/test 는 아래 DevTestSessionConfig 의
    // MapSessionRepository 가 대신한다(SessionAutoConfiguration 은 spring.session.store-type=none
    // 으로 dev/test 에서 비활성화됨 — application-dev.yml/application-test.yml 참고).
    //
    // @SpringSessionRedisConnectionFactory 한정자를 붙이면 Spring Session 이 여러
    // RedisConnectionFactory 빈(jwtConnectionFactory/cacheConnectionFactory/이 빈) 중 이 빈을
    // 세션 저장에 사용하도록 명시적으로 지정된다(빈 이름 기반 억지 배선 대신 표준 방법).
    // =========================================================================================
    @Configuration
    @Profile("!dev & !test")
    static class ProdSessionRedisConfig {

        @Value("${sodam.session.redis.host:localhost}")
        private String sessionRedisHost;

        @Value("${sodam.session.redis.port:6380}")
        private int sessionRedisPort;

        @Bean
        @SpringSessionRedisConnectionFactory
        public RedisConnectionFactory sessionRedisConnectionFactory() {
            log.info("웹 콘솔 세션 전용 Redis 연결 팩토리 초기화 - 호스트: {}, 포트: {} (캐시/JWT Redis 와 물리 분리)",
                    sessionRedisHost, sessionRedisPort);
            RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(sessionRedisHost, sessionRedisPort);
            LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                    .commandTimeout(Duration.ofSeconds(5))
                    .shutdownTimeout(Duration.ofMillis(100))
                    .build();
            LettuceConnectionFactory factory = new LettuceConnectionFactory(config, clientConfig);
            factory.setValidateConnection(true);
            return factory;
        }
    }

    // =========================================================================================
    // dev/test 세션 저장소 — 실제 Redis 없이 in-memory MapSessionRepository.
    // ./gradlew test 는 Redis 없이 항상 통과해야 한다(CI 에도 Redis 없음).
    // =========================================================================================
    @Configuration
    @Profile({"dev", "test"})
    @EnableSpringHttpSession
    static class DevTestSessionConfig {

        @Value("${sodam.session.timeout-minutes:30}")
        private int sessionTimeoutMinutes;

        @Bean
        public MapSessionRepository sessionRepository() {
            log.info("WebSessionSecurityConfig: MapSessionRepository 등록 (dev/test — Redis 없이 인메모리 세션)");
            MapSessionRepository repository = new MapSessionRepository(new ConcurrentHashMap<>());
            repository.setDefaultMaxInactiveInterval(Duration.ofMinutes(sessionTimeoutMinutes));
            return repository;
        }
    }

    // =========================================================================================
    // 공통 빈 — 프로필 무관
    // =========================================================================================

    /**
     * 세션 쿠키 직렬화 설정 — HttpOnly + Secure(env 로 override 가능) + SameSite=Strict.
     * Spring Session 이 활성화되면 {@code server.servlet.session.cookie.*} 프로퍼티는 더 이상
     * 적용되지 않으므로(컨테이너 네이티브 세션이 아니라 Spring Session 이 쿠키를 직접 관리)
     * 이 빈으로 명시 설정한다.
     */
    @Bean
    public DefaultCookieSerializer sodamSessionCookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName(SESSION_COOKIE_NAME);
        serializer.setUseHttpOnlyCookie(true);
        serializer.setUseSecureCookie(sessionCookieSecure);
        serializer.setSameSite("Strict");
        serializer.setCookiePath("/");
        // 쿠키 값 = 세션 ID 원문 그대로(Base64 래핑 없음) — 애플리케이션/테스트 코드가 쿠키 값으로
        // 저장소(MapSessionRepository/Redis)를 직접 조회할 때 별도 디코딩 단계 없이 동작하게 한다.
        serializer.setUseBase64Encoding(false);
        return serializer;
    }

    @Bean
    public HttpSessionIdResolver sodamHttpSessionIdResolver(DefaultCookieSerializer sodamSessionCookieSerializer) {
        CookieHttpSessionIdResolver resolver = new CookieHttpSessionIdResolver();
        resolver.setCookieSerializer(sodamSessionCookieSerializer);
        return resolver;
    }

    /**
     * 세션 인증 저장소 — Spring Security 표준 {@link HttpSessionSecurityContextRepository} 그대로
     * 사용한다(커스텀 직렬화 로직 없음). 로그인 컨트롤러가 인증 성공 시 이 빈으로 SecurityContext 를
     * 세션에 영속화하고, 이후 요청은 {@link SecurityContextHolderFilter} 가 이 빈으로 자동 복원한다.
     */
    @Bean
    public SecurityContextRepository webSessionSecurityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SessionAbsoluteExpiryFilter sessionAbsoluteExpiryFilter() {
        return new SessionAbsoluteExpiryFilter(ABSOLUTE_SESSION_TTL);
    }

    @Bean
    public SodamCsrfFilter sodamCsrfFilter() {
        List<String> allowedOrigins = Arrays.stream(csrfAllowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        return new SodamCsrfFilter(allowedOrigins);
    }

    /**
     * 위 두 필터는 {@code webSessionFilterChain} 안에서만 {@code addFilterBefore/After} 로 실행돼야
     * 한다. 그런데 Spring Boot 는 {@link jakarta.servlet.Filter} 타입 빈을 발견하면 자동으로
     * 서블릿 컨테이너 전역 필터로도 등록해버린다({@code /*} 전체 URL, Spring Security 매칭과 무관) —
     * 이 자동등록을 막지 않으면 CSRF/세션-만료 필터가 {@code /api/web/**} 와 무관한 기존 API
     * (예: {@code /api/join}, {@code /api/user/me})에도 이중으로 걸려 오동작한다(실제로 이 버그로
     * 회귀 테스트 28건이 CSRF_VALIDATION_FAILED 로 깨졌던 것을 확인했다). 표준 해법은 각 필터에
     * 대해 비활성화된 {@link FilterRegistrationBean} 을 명시적으로 등록해 Boot 의 전역 자동등록을
     * 억제하는 것 — Spring Security DSL 의 addFilterBefore/After 는 이 등록과 무관하게 정상 동작한다.
     */
    @Bean
    public FilterRegistrationBean<SessionAbsoluteExpiryFilter> sessionAbsoluteExpiryFilterRegistration(
            SessionAbsoluteExpiryFilter filter) {
        FilterRegistrationBean<SessionAbsoluteExpiryFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<SodamCsrfFilter> sodamCsrfFilterRegistration(SodamCsrfFilter filter) {
        FilterRegistrationBean<SodamCsrfFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * 웹 콘솔 세션 요청 판별 — {@code /api/web/**} 경로(로그인 등, 아직 세션 쿠키가 없을 수 있음)
     * 이거나, 요청에 {@value #SESSION_COOKIE_NAME} 쿠키가 실려 있으면(로그인 이후 브라우저가 기존
     * {@code /api/**} 업무 API — 예: 매장 조회 — 를 호출하는 경우) 이 체인이 담당한다.
     *
     * <p>왜 경로만으로 가를 수 없는가: 04_보안정책.md/완료기준 C4 는 "세션 쿠키만으로 기존
     * {@code /api/**} 보호 리소스에 접근 시 정상 200"을 요구한다 — 즉 세션 인증은 {@code /api/web/**}
     * 신규 엔드포인트뿐 아니라 기존 업무 컨트롤러(StoreController 등)에도 동일하게 적용돼야 한다.
     * 반면 기존 JWT STATELESS 체인({@link SecurityConfig})은 절대 수정하지 않아야 하므로, 두 체인이
     * 같은 URL 공간(`/api/stores/**` 등)을 두고 겹칠 수밖에 없다. Spring Security 는 첫 매치 체인만
     * 쓰고 이후 체인은 아예 시도하지 않으므로, "세션 쿠키가 있는 요청만" 이 체인으로 흡수하고
     * 나머지(JWT 를 쓰는 모바일 요청 — 이 쿠키를 보내지 않음)는 그대로 기존 체인으로 흘려보내는
     * 방식으로 두 인증 수단을 같은 URL 공간에서 충돌 없이 공존시킨다.
     */
    private static final RequestMatcher WEB_SESSION_REQUEST_MATCHER = request -> {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        String path = (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath))
                ? uri.substring(contextPath.length()) : uri;
        if (path.startsWith("/api/web/")) {
            return true;
        }
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return false;
        }
        for (jakarta.servlet.http.Cookie cookie : cookies) {
            if (SESSION_COOKIE_NAME.equals(cookie.getName())) {
                return true;
            }
        }
        return false;
    };

    /**
     * 웹 콘솔 전용 세션 인증 필터체인 — {@link #WEB_SESSION_REQUEST_MATCHER} 로 매칭된 요청만 처리한다.
     * {@code @Order(1)} 로 기존 {@link SecurityConfig#filterChain} (명시 순서 없음 = 최저 우선순위)
     * 보다 먼저 평가된다. 세션 쿠키가 없는 요청(모바일 JWT 클라이언트)은 이 체인에 매칭되지 않아
     * 그대로 기존 STATELESS 체인으로 흘러가므로 모바일 동작에 영향이 없다.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain webSessionFilterChain(HttpSecurity http,
                                                       SecurityContextRepository webSessionSecurityContextRepository,
                                                       SessionAbsoluteExpiryFilter sessionAbsoluteExpiryFilter,
                                                       SodamCsrfFilter sodamCsrfFilter,
                                                       JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) throws Exception {
        http
                .securityMatcher(WEB_SESSION_REQUEST_MATCHER)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/web/auth/login").permitAll()
                        .anyRequest().authenticated())
                // Double Submit Cookie 는 SodamCsrfFilter 로 직접 구현 — Security 기본 CSRF 저장소 미사용.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configure(http))
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31_536_000)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(sc -> sc.securityContextRepository(webSessionSecurityContextRepository))
                // 세션 만료/무효 시 반드시 401 (403 금지) — 기존 JwtAuthenticationEntryPoint 재사용.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthenticationEntryPoint))
                .addFilterBefore(sessionAbsoluteExpiryFilter, SecurityContextHolderFilter.class)
                .addFilterAfter(sodamCsrfFilter, SecurityContextHolderFilter.class);

        return http.build();
    }
}
