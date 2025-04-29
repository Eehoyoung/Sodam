package com.rich.sodam.securicy.config;

import com.rich.sodam.securicy.JwtTokenProvider;
import com.rich.sodam.securicy.filter.JwtAuthenticationFilter;
import lombok.Getter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security 설정을 담당하는 구성 클래스
 */
@Getter
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SecurityConfig.class);
    
    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
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
                .authorizeHttpRequests(authz -> authz
                        // 인증 없이 접근 가능한 경로 설정
                        .requestMatchers("/", "/login/**", "/api/public/**", "/index",
                                "/kakao/auth/proc", "/kakao/**").permitAll()
                        // 그 외 모든 요청은 인증 필요
                        .anyRequest().authenticated()
                )
                .logout(logout -> logout
                        .logoutSuccessUrl("/")
                        .permitAll()
                )
                // CSRF 보호 비활성화 (REST API에서는 일반적으로 비활성화)
                .csrf(csrf -> csrf.disable())
                // 세션 관리 정책 설정 (JWT 사용으로 STATELESS 정책 사용)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // JWT 인증 필터 추가
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        log.info("Spring Security 필터 체인 구성 완료");
        return http.build();
    }

    /**
     * JWT 인증 필터 빈을 생성합니다.
     *
     * @return JwtAuthenticationFilter 인스턴스
     */
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        log.debug("JWT 인증 필터 생성");
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }
}