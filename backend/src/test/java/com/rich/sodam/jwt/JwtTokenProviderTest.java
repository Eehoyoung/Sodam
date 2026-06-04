package com.rich.sodam.jwt;

import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.InvalidTokenException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * JWT 토큰 생성·검증·추출 단위 테스트 (Auth 커버리지 보강).
 * 시각 의존(만료)은 validity 초를 음수로 주입해 결정론적으로 검증.
 */
class JwtTokenProviderTest {

    private static final String SECRET = "sodam-test-secret-key-sodam-test-secret-key-1234567890"; // ≥256bit

    private UserDetailsService userDetailsService;
    private JwtTokenProvider provider;

    private User user(Long id, String email) {
        User u = new User(email, "테스터");
        u.setUserGrade(UserGrade.Personal);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private JwtTokenProvider newProvider(long validitySeconds) {
        JwtTokenProvider p = new JwtTokenProvider(userDetailsService);
        ReflectionTestUtils.setField(p, "secretKey", SECRET);
        ReflectionTestUtils.setField(p, "tokenValidityInSeconds", validitySeconds);
        p.init();
        return p;
    }

    @BeforeEach
    void setUp() {
        userDetailsService = mock(UserDetailsService.class);
        provider = newProvider(3600);
    }

    @Test
    @DisplayName("생성한 토큰은 유효하고 userId 클레임을 보존한다")
    void createAndValidate() {
        String token = provider.createToken(user(42L, "a@b.com"));
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.getUserId(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("getAuthentication 은 subject(email)로 UserDetails 를 로드한다")
    void authenticationLoadsUser() {
        UserDetails details = new org.springframework.security.core.userdetails.User("a@b.com", "x",
                List.of(new SimpleGrantedAuthority("ROLE_PERSONAL")));
        when(userDetailsService.loadUserByUsername("a@b.com")).thenReturn(details);

        String token = provider.createToken(user(1L, "a@b.com"));
        Authentication auth = provider.getAuthentication(token);
        assertThat(auth.getName()).isEqualTo("a@b.com");
        assertThat(auth.getAuthorities()).extracting("authority").contains("ROLE_PERSONAL");
    }

    @Test
    @DisplayName("만료된 토큰은 validateToken=false, 클레임 추출 시 InvalidTokenException")
    void expiredToken() {
        JwtTokenProvider expired = newProvider(-10); // 이미 만료
        String token = expired.createToken(user(1L, "a@b.com"));
        assertThat(provider.validateToken(token)).isFalse();
        assertThatThrownBy(() -> provider.getUserId(token)).isInstanceOf(InvalidTokenException.class);
    }

    @Test
    @DisplayName("변조/잘못된 형식 토큰은 false")
    void malformedToken() {
        assertThat(provider.validateToken("not.a.jwt")).isFalse();
        assertThat(provider.validateToken("")).isFalse();
    }

    @Test
    @DisplayName("다른 시크릿으로 서명된 토큰은 서명 불일치로 false")
    void wrongSignature() {
        JwtTokenProvider other = new JwtTokenProvider(userDetailsService);
        ReflectionTestUtils.setField(other, "secretKey", "another-secret-key-another-secret-key-0987654321");
        ReflectionTestUtils.setField(other, "tokenValidityInSeconds", 3600L);
        other.init();
        String foreignToken = other.createToken(user(1L, "a@b.com"));
        assertThat(provider.validateToken(foreignToken)).isFalse();
    }

    @Test
    @DisplayName("resolveToken: Bearer 접두사 제거, 없으면 null")
    void resolveToken() {
        HttpServletRequest withBearer = mock(HttpServletRequest.class);
        when(withBearer.getHeader("Authorization")).thenReturn("Bearer abc.def.ghi");
        assertThat(provider.resolveToken(withBearer)).isEqualTo("abc.def.ghi");

        HttpServletRequest noHeader = mock(HttpServletRequest.class);
        when(noHeader.getHeader("Authorization")).thenReturn(null);
        assertThat(provider.resolveToken(noHeader)).isNull();

        HttpServletRequest noBearer = mock(HttpServletRequest.class);
        when(noBearer.getHeader("Authorization")).thenReturn("Basic abc");
        assertThat(provider.resolveToken(noBearer)).isNull();
    }
}
