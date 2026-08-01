package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.OnboardingService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

class OnboardingControllerSecurityTest {

    @Test
    void ownerOnboardingLookupRejectsAnEmployeeOutsideThePathStore() {
        OnboardingService onboardingService = mock(OnboardingService.class);
        StoreAuthorizationPolicy storeAccessGuard = mock(StoreAuthorizationPolicy.class);
        OnboardingController controller = new OnboardingController(onboardingService, storeAccessGuard);
        UserPrincipal principal = mock(UserPrincipal.class);
        org.mockito.Mockito.when(principal.getId()).thenReturn(1L);
        doThrow(new AccessDeniedException("not a member"))
                .when(storeAccessGuard).assertEmployeeInStore(99L, 10L);

        assertThatThrownBy(() -> controller.forOwner(principal, 10L, 99L))
                .isInstanceOf(AccessDeniedException.class);

        verify(storeAccessGuard).assertMasterOwnsStore(1L, 10L);
        verify(storeAccessGuard).assertEmployeeInStore(99L, 10L);
        verify(onboardingService, never()).forEmployee(10L, 99L);
    }
}
