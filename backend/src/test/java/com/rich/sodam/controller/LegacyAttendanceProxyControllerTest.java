package com.rich.sodam.controller;

import com.rich.sodam.dto.request.AttendanceRequestDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.AttendanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class LegacyAttendanceProxyControllerTest {

    @Mock
    private AttendanceService attendanceService;
    @Mock
    private StoreAuthorizationPolicy guard;
    @InjectMocks
    private LegacyAttendanceProxyController controller;

    @Test
    @DisplayName("구 출근 경로도 다른 직원 ID를 전달하면 서비스 호출 전에 차단한다")
    void legacyCheckIn_deniesOtherEmployeeBeforeServiceCall() {
        UserPrincipal principal = new UserPrincipal(1L, "employee@sodam.dev", List.of());
        AttendanceRequestDto request = AttendanceRequestDto.builder()
                .employeeId(99L)
                .storeId(7L)
                .latitude(37.5)
                .longitude(127.0)
                .build();
        doThrow(new AccessDeniedException("self only"))
                .when(guard).assertSelf(1L, 99L);

        assertThatThrownBy(() -> controller.legacyCheckIn(principal, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(attendanceService);
    }

    @Test
    @DisplayName("구 퇴근 경로도 다른 직원 ID를 전달하면 서비스 호출 전에 차단한다")
    void legacyCheckOut_deniesOtherEmployeeBeforeServiceCall() {
        UserPrincipal principal = new UserPrincipal(1L, "employee@sodam.dev", List.of());
        AttendanceRequestDto request = AttendanceRequestDto.builder()
                .employeeId(99L)
                .storeId(7L)
                .latitude(37.5)
                .longitude(127.0)
                .build();
        doThrow(new AccessDeniedException("self only"))
                .when(guard).assertSelf(1L, 99L);

        assertThatThrownBy(() -> controller.legacyCheckOut(principal, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(attendanceService);
    }
}
