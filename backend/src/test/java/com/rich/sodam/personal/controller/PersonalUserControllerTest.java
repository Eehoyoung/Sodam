package com.rich.sodam.personal.controller;

import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.personal.service.PersonalTaxService;
import com.rich.sodam.personal.service.PersonalUserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonalUserControllerTest {

    @Mock
    private PersonalUserService personalUserService;
    @Mock
    private PersonalTaxService personalTaxService;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private RedisTemplate<String, Object> cacheRedis;
    @InjectMocks
    private PersonalUserController controller;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("매장 사장 역할은 관계 없는 개인 사용자 프로필에 접근할 수 없다")
    void getProfile_deniesMasterAccessToAnotherPersonalUser() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer master-token");
        when(jwtTokenProvider.resolveToken(request)).thenReturn("master-token");
        when(jwtTokenProvider.validateToken(anyString())).thenReturn(true);
        when(jwtTokenProvider.getUserId("master-token")).thenReturn(10L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "master@sodam.dev",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_MASTER"))));

        ResponseEntity<?> response = controller.getProfile(99L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(personalUserService);
    }
}
