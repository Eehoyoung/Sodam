package com.rich.sodam.controller;

import com.rich.sodam.dto.request.BreakRecordCreateRequest;
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

class BreakRecordControllerSecurityTest {

    @Test
    void masterCannotCreateBreakRecordForEmployeeOutsideTheStore() {
        BreakRecordService service = mock(BreakRecordService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        BreakRecordController controller = new BreakRecordController(service, guard);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(1L);
        doThrow(new AccessDeniedException("employee is outside the store"))
                .when(guard).assertEmployeeInStore(2L, 10L);

        BreakRecordCreateRequest request = new BreakRecordCreateRequest();

        assertThatThrownBy(() -> controller.add(principal, 10L, 2L, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(service);
    }
}
