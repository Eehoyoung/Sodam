package com.rich.sodam.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Sign in with Apple identityToken(RS256) 서명 검증용 {@link JwtDecoder} 빈.
 * Apple 의 JWKS 엔드포인트에서 공개키를 받아 kid 매칭·서명 검증·캐싱을 표준 처리한다(Nimbus 내부).
 * 빈 생성 시점에는 네트워크 호출이 없다 — 최초 {@code decode()} 호출 시에만 JWKS 를 조회(+캐시)한다.
 * (기본 검증기는 exp/nbf 타임스탬프까지만 확인하고 iss/aud 는 검증하지 않으므로,
 * 호출부(AppleAuthService)에서 반드시 별도로 확인해야 한다.)
 */
@Configuration
public class AppleAuthConfig {

    private static final String APPLE_JWK_SET_URI = "https://appleid.apple.com/auth/keys";

    @Bean
    public JwtDecoder appleJwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri(APPLE_JWK_SET_URI).build();
    }
}
