package com.rich.sodam.service;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * 플랜 게이팅 접근 제어 단위 테스트.
 */
@ExtendWith(MockitoExtension.class)
class PlanAccessServiceTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @InjectMocks private PlanAccessService planAccessService;

    private static final Long USER_ID = 42L;

    private void authenticateAs() {
        UserPrincipal principal = new UserPrincipal(USER_ID, "owner@x.com", Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList()));
    }

    private void givenActivePlan(PlanType plan) {
        User u = new User("owner@x.com", "사장님");
        Subscription s = Subscription.pending(u, plan, BillingCycle.MONTHLY, "cust");
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        when(subscriptionRepository.findFirstByUser_IdAndStatusIn(eq(USER_ID), any()))
                .thenReturn(Optional.of(s));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("활성 구독이 없으면 FREE 로 간주")
    void noSubscription_isFree() {
        authenticateAs();
        when(subscriptionRepository.findFirstByUser_IdAndStatusIn(eq(USER_ID), any()))
                .thenReturn(Optional.empty());
        assertThat(planAccessService.currentPlan()).isEqualTo(PlanType.FREE);
    }

    @Test
    @DisplayName("FREE 가 PRO 기능 호출 → PlanRequiredException(402 매핑)")
    void freeBlockedFromProFeature() {
        authenticateAs();
        when(subscriptionRepository.findFirstByUser_IdAndStatusIn(eq(USER_ID), any()))
                .thenReturn(Optional.empty()); // FREE
        assertThatThrownBy(() -> planAccessService.assertAccess(
                PlanType.PRO, new PlanFeature[]{PlanFeature.INSURANCE_FILING}))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("PRO 는 PRO 최소·PRO 기능 모두 통과")
    void proPasses() {
        authenticateAs();
        givenActivePlan(PlanType.PRO);
        assertThatCode(() -> planAccessService.assertAccess(
                PlanType.PRO, new PlanFeature[]{PlanFeature.INSURANCE_FILING, PlanFeature.ANNUAL_LEAVE}))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("STARTER 가 PREMIUM 전용 기능 호출 → 차단")
    void starterBlockedFromPremiumFeature() {
        authenticateAs();
        givenActivePlan(PlanType.STARTER);
        assertThatThrownBy(() -> planAccessService.assertAccess(
                PlanType.STARTER, new PlanFeature[]{PlanFeature.PARTNER_REFERRAL}))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("직원수 상한 초과 → 차단")
    void employeeCapacityGate() {
        authenticateAs();
        givenActivePlan(PlanType.STARTER); // 5명 상한
        assertThatThrownBy(() -> planAccessService.assertEmployeeCapacity(6))
                .isInstanceOf(PlanRequiredException.class);
        assertThatCode(() -> planAccessService.assertEmployeeCapacity(5))
                .doesNotThrowAnyException();
    }
}
