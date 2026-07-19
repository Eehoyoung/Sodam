package com.rich.sodam.controller;

import com.rich.sodam.dto.request.DailySalesUpsertRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.DailySalesService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
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

/**
 * 일일 매출 API 권한 — 미소유 매장 접근 시 StoreAuthorizationPolicy 가 차단(BOLA)하고 서비스에 도달하지 않는다.
 */
@ExtendWith(MockitoExtension.class)
class DailySalesControllerTest {

    @Mock
    DailySalesService dailySalesService;
    @Mock
    StoreAuthorizationPolicy guard;
    @InjectMocks
    DailySalesController controller;

    private final UserPrincipal principal = new UserPrincipal(99L, "boss@sodam.dev", List.of());

    @Test
    @DisplayName("소유하지 않은 매장에 매출 입력 시 AccessDeniedException(403) — 서비스 미호출")
    void upsertDeniedForNonOwner() {
        doThrow(new AccessDeniedException("해당 매장에 대한 권한이 없어요."))
                .when(guard).assertMasterOwnsStore(99L, 7L);

        assertThatThrownBy(() -> controller.upsert(principal, 7L,
                new DailySalesUpsertRequest(LocalDate.of(2026, 7, 1), 100_000L)))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(dailySalesService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매출 조회도 403 — 서비스 미호출")
    void recentDeniedForNonOwner() {
        doThrow(new AccessDeniedException("해당 매장에 대한 권한이 없어요."))
                .when(guard).assertMasterOwnsStore(99L, 7L);

        assertThatThrownBy(() -> controller.recent(principal, 7L, 7))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(dailySalesService);
    }
}
