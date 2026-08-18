package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.exception.EntityNotFoundException;

import java.util.Optional;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserService userService;
    @Mock private StoreAuthorizationPolicy storeAccessGuard;
    @InjectMocks private UserController controller;

    @Test
    @DisplayName("다른 매장 사장은 관계 없는 사용자의 개인정보를 조회할 수 없다")
    void getUserById_deniesMasterWithoutEmployeeStoreRelationship() {
        UserPrincipal principal = new UserPrincipal(1L, "master@sodam.dev",
                List.of(new SimpleGrantedAuthority("ROLE_MASTER")));
        doThrow(new AccessDeniedException("employee is not in an owned store"))
                .when(storeAccessGuard).assertCanViewEmployee(1L, 99L, true);

        assertThatThrownBy(() -> controller.getUserById(99L, principal))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(userService);
    }

    /**
     * H-1 — 컨트롤러가 catch(Exception) 으로 예외를 삼키면 GlobalExceptionHandler 를 우회해
     * 스택트레이스와 errorCode 가 사라진다. 운영 장애의 원인 추적이 불가능해지는 게 실제 피해다.
     */
    @Test
    @DisplayName("사용자 조회 실패는 GlobalExceptionHandler 로 전파된다(삼키지 않는다)")
    void getUserById_propagatesNotFound() {
        UserPrincipal principal = new UserPrincipal(7L, "me@sodam.dev", List.of());
        when(userService.findById(7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getUserById(7L, principal))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("사업주 전환 실패는 GlobalExceptionHandler 로 전파된다")
    void convertToOwner_propagatesServiceException() {
        UserPrincipal principal = new UserPrincipal(7L, "me@sodam.dev", List.of());
        when(userService.convertToOwner(7L)).thenThrow(new IllegalArgumentException("이미 사업주입니다."));

        assertThatThrownBy(() -> controller.convertToOwner(7L, principal))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("직원 정보 수정 실패는 GlobalExceptionHandler 로 전파된다")
    void updateEmployeeInfo_propagatesServiceException() {
        UserPrincipal principal = new UserPrincipal(1L, "master@sodam.dev",
                List.of(new SimpleGrantedAuthority("ROLE_MASTER")));
        EmployeeUpdateDto dto = new EmployeeUpdateDto();
        when(userService.updateEmployeeInfo(99L, dto))
                .thenThrow(new IllegalArgumentException("직원을 찾을 수 없습니다."));

        assertThatThrownBy(() -> controller.updateEmployee(principal, 99L, dto))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("탈퇴 실패(활성 구독)는 GlobalExceptionHandler 로 전파된다")
    void withdrawUser_propagatesServiceException() {
        UserPrincipal principal = new UserPrincipal(7L, "me@sodam.dev", List.of());
        doThrow(new IllegalStateException("활성 구독이 있어 탈퇴할 수 없습니다."))
                .when(userService).withdrawUser(7L);

        assertThatThrownBy(() -> controller.withdrawUser(7L, principal))
                .isInstanceOf(IllegalStateException.class);
    }
}
