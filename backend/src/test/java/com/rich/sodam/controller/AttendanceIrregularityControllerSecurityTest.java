package com.rich.sodam.controller;

import com.rich.sodam.dto.request.AttendanceNoticeCreateRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.AttendanceIrregularityService;
import com.rich.sodam.service.AttendanceNoticeService;
import com.rich.sodam.service.ManagerSupervisionNotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AttendanceIrregularityControllerSecurityTest {

    @Test
    void inactiveEmployeeCannotCreateAttendanceNotice() {
        AttendanceIrregularityService irregularityService = mock(AttendanceIrregularityService.class);
        AttendanceNoticeService noticeService = mock(AttendanceNoticeService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        ManagerSupervisionNotificationService supervision = mock(ManagerSupervisionNotificationService.class);
        AttendanceIrregularityController controller = new AttendanceIrregularityController(
                irregularityService, noticeService, guard, supervision);
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(2L);
        doThrow(new AccessDeniedException("inactive employee-store relation"))
                .when(guard).assertActiveEmployeeInStore(2L, 10L);

        assertThatThrownBy(() -> controller.createNotice(principal, 10L, new AttendanceNoticeCreateRequest()))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(irregularityService, noticeService, supervision);
    }
}
