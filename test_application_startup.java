package com.rich.sodam;

import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * 애플리케이션 시작 테스트 스크립트
 * JWT 시크릿 키와 BCryptPasswordEncoder 빈 설정이 올바른지 확인
 */
public class TestApplicationStartup {
    public static void main(String[] args) {
        System.out.println("[DEBUG_LOG] 애플리케이션 시작 테스트 시작");

        try {
            // 애플리케이션 컨텍스트 로드 테스트
            ConfigurableApplicationContext context = SpringApplication.run(SodamApplication.class, args);

            System.out.println("[DEBUG_LOG] 애플리케이션 컨텍스트 로드 성공");

            // JWT 토큰 프로바이더 빈 확인
            if (context.containsBean("jwtTokenProvider")) {
                System.out.println("[DEBUG_LOG] JwtTokenProvider 빈 로드 성공");
            }

            // BCryptPasswordEncoder 빈 확인
            if (context.containsBean("bCryptPasswordEncoder")) {
                System.out.println("[DEBUG_LOG] BCryptPasswordEncoder 빈 로드 성공");
            }

            // UserService 빈 확인
            if (context.containsBean("userService")) {
                System.out.println("[DEBUG_LOG] UserService 빈 로드 성공");
            }

            System.out.println("[DEBUG_LOG] 모든 필수 빈이 정상적으로 로드되었습니다.");

            // 컨텍스트 종료
            context.close();
            System.out.println("[DEBUG_LOG] 애플리케이션 시작 테스트 완료");

        } catch (Exception e) {
            System.err.println("[ERROR] 애플리케이션 시작 실패: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
