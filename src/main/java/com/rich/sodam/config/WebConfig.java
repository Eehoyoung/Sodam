package com.rich.sodam.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // 원하는 도메인 허용
        config.addAllowedOrigin("http://localhost:3000"); // React 웹 개발 서버
        config.addAllowedOrigin("http://localhost:8081"); // React Native 개발 서버
        config.addAllowedOrigin("capacitor://localhost"); // Capacitor (하이브리드 앱)
        config.addAllowedOrigin("ionic://localhost"); // Ionic (하이브리드 앱)
        config.addAllowedOrigin("http://10.0.2.2:8081"); // Android 에뮬레이터에서 localhost 접근
        config.addAllowedOrigin("exp://localhost:19000"); // Expo 개발 서버
        config.addAllowedOrigin("exp://127.0.0.1:19000"); // Expo 개발 서버 (IP 주소)

        // 실제 배포 환경의 도메인도 추가 (필요시)
        // config.addAllowedOrigin("https://your-production-domain.com");

        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
