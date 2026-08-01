package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.ShiftSwapService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ShiftSwapControllerSecurityTest {

    @Test
    void inactiveEmployeeCannotReadCurrentSwapRequests() {
        ShiftSwapService service = mock(ShiftSwapService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        ShiftSwapController controller = new ShiftSwapController(service, guard);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(2L);
        doThrow(new AccessDeniedException("inactive employee-store relation"))
                .when(guard).assertActiveMemberOfStore(2L, 10L);

        assertThatThrownBy(() -> controller.list(principal, 10L, null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(service);
    }
}
