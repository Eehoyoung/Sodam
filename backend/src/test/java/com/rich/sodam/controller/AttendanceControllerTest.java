package com.rich.sodam.controller;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.dto.response.AttendanceResponseDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.AttendanceService;
import com.rich.sodam.service.AttendanceWorkLogService;
import com.rich.sodam.service.LocationVerificationService;
import com.rich.sodam.service.NfcVerificationService;
import com.rich.sodam.service.StoreAccessGuard;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 직원 오늘 출퇴근 단건 조회(/employee/{employeeId}/today) 다매장 storeId 필터링 회귀 테스트
 * (findings_report.md §1-7 — storeId 파라미터가 무시되어 다매장 직원 기록이 섞이던 버그).
 */
@ExtendWith(MockitoExtension.class)
class AttendanceControllerTest {

    @Mock
    AttendanceService attendanceService;
    @Mock
    LocationVerificationService locationVerificationService;
    @Mock
    NfcVerificationService nfcVerificationService;
    @Mock
    AttendanceWorkLogService attendanceWorkLogService;
    @Mock
    StoreAccessGuard guard;
    @InjectMocks
    AttendanceController controller;

    private final UserPrincipal principal = new UserPrincipal(1L, "emp@sodam.dev", List.of());

    @Test
    @DisplayName("다매장 직원 오늘 출퇴근 조회 - storeId 지정 시 해당 매장 기록만 조회한다(매장별 필터링 누락 회귀 방지)")
    void getTodayAttendance_withStoreId_filtersByStoreOnly() {
        Long employeeId = 1L;
        Long storeId = 7L;
        Attendance storeAttendance = mock(Attendance.class);

        // storeId 를 넘기면 매장까지 지정된 서비스 메서드를 호출해야 한다.
        when(attendanceService.getAttendancesByEmployeeStoreAndPeriod(
                eq(employeeId), eq(storeId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(storeAttendance));

        ResponseEntity<AttendanceResponseDto> response = controller.getTodayAttendance(principal, employeeId, storeId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        // 매장 미지정 버전(전체 매장 뒤섞임)은 호출되면 안 된다.
        verify(attendanceService, never()).getAttendancesByEmployeeAndPeriod(anyLong(), any(), any());
    }

    @Test
    @DisplayName("직원 오늘 출퇴근 조회 - storeId 미지정 시 기존처럼 전체 매장 기준으로 조회한다(하위호환)")
    void getTodayAttendance_withoutStoreId_usesLegacyLookup() {
        Long employeeId = 1L;
        Attendance attendance = mock(Attendance.class);

        when(attendanceService.getAttendancesByEmployeeAndPeriod(eq(employeeId), any(), any()))
                .thenReturn(List.of(attendance));

        ResponseEntity<AttendanceResponseDto> response = controller.getTodayAttendance(principal, employeeId, null);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(attendanceService, never()).getAttendancesByEmployeeStoreAndPeriod(
                anyLong(), anyLong(), any(), any());
    }
}
