package com.rich.sodam.controller;

import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.LocaleResolver;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginControllerKakaoSecurityTest {

    @Mock private KakaoAuthService kakaoAuthService;
    @Mock private AppleAuthService appleAuthService;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private TokenService tokenService;
    @Mock private UserService userService;
    @Mock private TokenStore redisService;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private KakaoOAuthStateService kakaoOAuthStateService;
    @Mock private MessageSource messageSource;
    @Mock private LocaleResolver localeResolver;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @InjectMocks private LoginController controller;

    @Test
    void rejectsMissingStateAndVerifierBeforeCallingKakao() {
        when(localeResolver.resolveLocale(request)).thenReturn(Locale.KOREA);
        when(kakaoOAuthStateService.consume(null, null)).thenReturn(false);

        var result = controller.kakaoLogin("authorization-code", null, null, response, request);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(kakaoAuthService, jwtTokenProvider, tokenService, redisService, refreshTokenService);
    }
}
