package com.rich.sodam.controller;

import com.rich.sodam.dto.request.PurposeRequest;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * H-1 — 목적 설정 컨트롤러가 예외를 catch 로 삼켜 GlobalExceptionHandler 를 우회하면
 * errorCode·스택트레이스가 사라지고, 등급 다운그레이드 같은 정책 충돌의 409 의미도 흐려진다.
 */
@ExtendWith(MockitoExtension.class)
class UsersPurposeControllerTest {

    @Mock UserService userService;
    @Mock JwtTokenProvider jwtTokenProvider;
    @Mock HttpServletRequest httpRequest;

    private UsersPurposeController controller() {
        return new UsersPurposeController(userService, jwtTokenProvider);
    }

    private PurposeRequest request(String purpose) {
        PurposeRequest r = new PurposeRequest();
        r.setPurpose(purpose);
        return r;
    }

    private void authenticatedAs(long userId) {
        when(jwtTokenProvider.resolveToken(httpRequest)).thenReturn("token");
        when(jwtTokenProvider.validateToken("token")).thenReturn(true);
        when(jwtTokenProvider.getUserId("token")).thenReturn(userId);
    }

    @Test
    @DisplayName("정책 충돌(등급 다운그레이드)은 ConflictException 으로 전파된다 — 409 유지")
    void policyConflictPropagates() {
        authenticatedAs(7L);
        when(userService.updatePurpose(7L, "personal"))
                .thenThrow(new ConflictException("권한을 낮출 수 없습니다."));

        assertThatThrownBy(() -> controller().setPurpose(7L, request("personal"), httpRequest))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("잘못된 purpose 값은 GlobalExceptionHandler 로 전파된다(삼키지 않는다)")
    void invalidPurposePropagates() {
        authenticatedAs(7L);
        when(userService.updatePurpose(7L, "wrong"))
                .thenThrow(new IllegalArgumentException("지원하지 않는 purpose"));

        assertThatThrownBy(() -> controller().setPurpose(7L, request("wrong"), httpRequest))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("본인이 아니면 401 — 인가 판단은 그대로 컨트롤러가 응답한다")
    void otherUserIsUnauthorized() {
        authenticatedAs(8L);

        var response = controller().setPurpose(7L, request("boss"), httpRequest);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }
}
