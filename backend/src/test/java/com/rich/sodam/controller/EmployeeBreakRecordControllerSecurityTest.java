package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.BreakRecordService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EmployeeBreakRecordControllerSecurityTest {

    @Test
    void inactiveEmployeeCannotStartOrEndBreak() {
        BreakRecordService service = mock(BreakRecordService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        EmployeeBreakRecordController controller = new EmployeeBreakRecordController(service, guard);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(2L);
        doThrow(new AccessDeniedException("inactive employee-store relation"))
                .when(guard).assertActiveEmployeeInStore(2L, 10L);

        assertThatThrownBy(() -> controller.start(principal, 10L))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.end(principal, 10L, 99L))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(service);
    }
}
