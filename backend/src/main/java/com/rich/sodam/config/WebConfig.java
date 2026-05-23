package com.rich.sodam.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

/**
 * CORS 설정.
 *
 * 보안: AllowedOriginPattern("*") 제거 — credentials=true 와 wildcard 조합은 spec 위반 + CSRF 노출.
 * 운영 도메인은 환경변수 SODAM_CORS_ALLOWED_ORIGINS (콤마 구분) 로 주입.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** 개발용 기본 origin (에뮬레이터/Metro/Expo). */
    private static final List<String> DEV_ORIGINS = List.of(
            "http://localhost:3000",
            "http://localhost:7070",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://10.0.2.2:3000",
            "http://10.0.2.2:7070",
            "http://10.0.2.2:8081",
            "http://10.0.2.2:8082",
            "capacitor://localhost",
            "ionic://localhost",
            "exp://localhost:19000",
            "exp://127.0.0.1:19000"
    );

    @Value("${sodam.cors.allowed-origins:}")
    private String allowedOriginsCsv;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // 명시적 origin 만 허용 (wildcard pattern 제거)
        DEV_ORIGINS.forEach(config::addAllowedOrigin);

        // 운영 도메인은 환경변수로 추가 (e.g., SODAM_CORS_ALLOWED_ORIGINS=https://sodam.app,https://www.sodam.app)
        if (allowedOriginsCsv != null && !allowedOriginsCsv.isBlank()) {
            Arrays.stream(allowedOriginsCsv.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .forEach(config::addAllowedOrigin);
        }

        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
