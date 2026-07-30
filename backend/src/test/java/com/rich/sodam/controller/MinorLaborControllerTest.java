package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.MinorLaborGuardService;
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
class MinorLaborControllerTest {

    @Mock
    private MinorLaborGuardService minorLaborGuardService;
    @Mock
    private StoreAuthorizationPolicy storeAccessGuard;
    @InjectMocks
    private MinorLaborController controller;

    @Test
    @DisplayName("매장 사장은 자기 매장에 소속되지 않은 직원의 미성년 보호 정보를 조회할 수 없다")
    void minorGuard_deniesEmployeeOutsideRequestedStore() {
        UserPrincipal principal = new UserPrincipal(1L, "master@sodam.dev", List.of());
        doThrow(new AccessDeniedException("employee is not in store"))
                .when(storeAccessGuard).assertEmployeeInStore(99L, 10L);

        assertThatThrownBy(() -> controller.minorGuard(principal, 10L, 99L))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(minorLaborGuardService);
    }
}
