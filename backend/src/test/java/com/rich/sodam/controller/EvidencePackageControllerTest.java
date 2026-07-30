package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.EvidencePackageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class EvidencePackageControllerTest {

    @Mock
    private EvidencePackageService evidencePackageService;
    @Mock
    private StoreAuthorizationPolicy storeAccessGuard;
    @InjectMocks
    private EvidencePackageController controller;

    @Test
    @DisplayName("매장 사장은 자기 매장에 소속되지 않은 직원의 증거 패키지를 조회할 수 없다")
    void evidence_deniesEmployeeOutsideRequestedStore() {
        UserPrincipal principal = new UserPrincipal(1L, "master@sodam.dev", List.of());
        doThrow(new AccessDeniedException("employee is not in store"))
                .when(storeAccessGuard).assertEmployeeInStore(99L, 10L);

        assertThatThrownBy(() -> controller.evidence(
                principal,
                10L,
                99L,
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 31)))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(evidencePackageService);
    }
}
