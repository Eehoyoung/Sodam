package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Sign in with Apple identityToken 검증·사용자 매칭 로직 단위 테스트.
 * 실제 Apple JWKS 네트워크 호출 없이 {@link JwtDecoder} 를 mock 한다(testing.md — 외부 API 의존 금지).
 */
@ExtendWith(MockitoExtension.class)
class AppleAuthServiceTest {

    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final String CLIENT_ID = "test.bundle.id";

    @Mock
    private JwtDecoder appleJwtDecoder;

    @Mock
    private UserRepository userRepository;

    private AppleAuthService appleAuthService;

    @BeforeEach
    void setUp() {
        IntegrationProperties integrationProperties = new IntegrationProperties();
        integrationProperties.getApple().setClientId(CLIENT_ID);
        appleAuthService = new AppleAuthService(appleJwtDecoder, userRepository, integrationProperties);
    }

    private Jwt appleJwt(String sub, String email, String issuer, String audience) {
        return Jwt.withTokenValue("identity-token")
                .header("alg", "RS256")
                .claim("sub", sub)
                .claim("iss", issuer)
                .claim("aud", List.of(audience))
                .claim("email", email)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
    }

    @Test
    void 정상_identityToken이면_신규_사용자를_생성한다() {
        when(appleJwtDecoder.decode("token")).thenReturn(appleJwt("apple-sub-1", "new@example.com", APPLE_ISSUER, CLIENT_ID));
        when(userRepository.findByAppleSub("apple-sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = appleAuthService.authenticate("token");

        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getAppleSub()).isEqualTo("apple-sub-1");
        assertThat(result.getUserGrade()).isEqualTo(UserGrade.Personal);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void appleSub로_매칭되는_기존_사용자면_재로그인_처리한다() {
        User existing = new User("existing@example.com", "기존유저");
        existing.setAppleSub("apple-sub-2");
        when(appleJwtDecoder.decode("token")).thenReturn(appleJwt("apple-sub-2", null, APPLE_ISSUER, CLIENT_ID));
        when(userRepository.findByAppleSub("apple-sub-2")).thenReturn(Optional.of(existing));

        User result = appleAuthService.authenticate("token");

        assertThat(result).isSameAs(existing);
        verify(userRepository, never()).save(any());
    }

    @Test
    void appleSub는_없지만_email이_기존_계정과_일치하면_계정을_연결한다() {
        User existingKakaoUser = new User("linked@example.com", "카카오유저");
        when(appleJwtDecoder.decode("token")).thenReturn(appleJwt("apple-sub-3", "linked@example.com", APPLE_ISSUER, CLIENT_ID));
        when(userRepository.findByAppleSub("apple-sub-3")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("linked@example.com")).thenReturn(Optional.of(existingKakaoUser));

        User result = appleAuthService.authenticate("token");

        assertThat(result).isSameAs(existingKakaoUser);
        assertThat(result.getAppleSub()).isEqualTo("apple-sub-3");
        verify(userRepository, never()).save(any());
    }

    @Test
    void issuer가_다르면_예외() {
        when(appleJwtDecoder.decode("token")).thenReturn(appleJwt("sub", "e@example.com", "https://evil.example.com", CLIENT_ID));

        assertThatThrownBy(() -> appleAuthService.authenticate("token"))
                .isInstanceOf(RuntimeException.class);
        verifyNoInteractions(userRepository);
    }

    @Test
    void audience가_다르면_예외() {
        when(appleJwtDecoder.decode("token")).thenReturn(appleJwt("sub", "e@example.com", APPLE_ISSUER, "다른.번들.아이디"));

        assertThatThrownBy(() -> appleAuthService.authenticate("token"))
                .isInstanceOf(RuntimeException.class);
        verifyNoInteractions(userRepository);
    }

    @Test
    void 서명_검증_실패시_예외() {
        when(appleJwtDecoder.decode("token")).thenThrow(new JwtException("invalid signature"));

        assertThatThrownBy(() -> appleAuthService.authenticate("token"))
                .isInstanceOf(RuntimeException.class);
        verifyNoInteractions(userRepository);
    }

    @Test
    void 신규_사용자인데_email이_없으면_생성_불가로_예외() {
        when(userRepository.findByAppleSub("apple-sub-4")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> appleAuthService.findOrCreateUser("apple-sub-4", null))
                .isInstanceOf(RuntimeException.class);
        verify(userRepository, never()).save(any());
    }
}
