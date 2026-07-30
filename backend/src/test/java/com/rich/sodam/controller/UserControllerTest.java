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
import static org.mockito.Mockito.doThrow;
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
}
