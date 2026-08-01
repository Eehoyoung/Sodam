package com.rich.sodam.controller;

import com.rich.sodam.dto.request.LocationVerifyRequest;
import com.rich.sodam.dto.request.NfcVerifyRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.AttendanceService;
import com.rich.sodam.service.AttendanceWorkLogService;
import com.rich.sodam.service.LocationVerificationService;
import com.rich.sodam.service.NfcVerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class AttendanceVerificationControllerSecurityTest {

    @Test
    void inactiveFormerEmployeeCannotProbeLocationOrNfcConfiguration() {
        AttendanceService attendanceService = mock(AttendanceService.class);
        LocationVerificationService locationVerificationService = mock(LocationVerificationService.class);
        NfcVerificationService nfcVerificationService = mock(NfcVerificationService.class);
        AttendanceWorkLogService attendanceWorkLogService = mock(AttendanceWorkLogService.class);
        StoreAuthorizationPolicy guard = mock(StoreAuthorizationPolicy.class);
        AttendanceController controller = new AttendanceController(
                attendanceService, locationVerificationService, nfcVerificationService, attendanceWorkLogService, guard);
        UserPrincipal principal = new UserPrincipal(2L, "former@example.test", List.of());
        doThrow(new AccessDeniedException("inactive employee-store relation"))
                .when(guard).assertActiveMemberOfStore(2L, 10L);

        LocationVerifyRequest location = new LocationVerifyRequest();
        location.setStoreId(10L);
        location.setLatitude(37.0);
        location.setLongitude(127.0);
        NfcVerifyRequest nfc = new NfcVerifyRequest();
        nfc.setStoreId(10L);
        nfc.setTagId("tag-1");

        assertThatThrownBy(() -> controller.verifyLocation(principal, location))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.verifyNfc(principal, nfc))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(locationVerificationService, nfcVerificationService);
    }
}
