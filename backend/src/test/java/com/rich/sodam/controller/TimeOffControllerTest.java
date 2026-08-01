package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.dto.request.TimeOffSelfRequest;
import com.rich.sodam.service.MyLeaveBalanceService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.TimeOffService;
import com.rich.sodam.service.ManagerSupervisionNotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class TimeOffControllerTest {

    @Mock
    TimeOffService timeOffService;
    @Mock
    StoreAuthorizationPolicy guard;
    @Mock
    MyLeaveBalanceService myLeaveBalanceService;
    @Mock
    ManagerSupervisionNotificationService supervision;
    @InjectMocks
    TimeOffController controller;

    @Test
    @DisplayName("사업주는 storeId 없는 직원 전 매장 휴가 조회를 할 수 없다")
    void getTimeOffsByEmployee_masterCannotReadAllStores() {
        UserPrincipal master = new UserPrincipal(1L, "master@sodam.dev", List.of(
                new SimpleGrantedAuthority("ROLE_MASTER")));
        doThrow(new AccessDeniedException("본인 정보만 접근할 수 있어요."))
                .when(guard).assertSelf(1L, 2L);

        assertThatThrownBy(() -> controller.getTimeOffsByEmployee(master, 2L))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(timeOffService);
    }

    @Test
    @DisplayName("비활성 직원은 과거 매장에 새 휴가를 신청할 수 없다")
    void createSelfTimeOff_deniesInactiveEmployeeStoreRelation() {
        UserPrincipal employee = new UserPrincipal(2L, "employee@sodam.dev", List.of());
        TimeOffSelfRequest request = new TimeOffSelfRequest(10L, LocalDate.now().plusDays(1),
                LocalDate.now().plusDays(1), "개인 사유", null, null, null, null);
        doThrow(new AccessDeniedException("inactive relation"))
                .when(guard).assertActiveEmployeeInStore(2L, 10L);

        assertThatThrownBy(() -> controller.createSelfTimeOffRequest(employee, request))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(timeOffService);
    }
}
