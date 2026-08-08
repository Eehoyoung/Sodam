package com.rich.sodam.integration;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.PlanAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-B — PRO 매장 수 쿼터.
 *
 * <p>가장 중요한 두 가지: <b>PREMIUM 은 무제한을 유지</b>하는가(요금제 화면에 "무제한"으로 고지했으므로
 * 상한을 씌우면 불이익 변경이다), 그리고 <b>기존 다점포 PRO 사장이 소급 차단되지 않는가</b>
 * (storeQuota grandfathering).</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class StoreQuotaGatingTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private PlanAccessService planAccessService;
    @Autowired private UserRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;

    private void authenticateWithPlan(PlanType plan, Integer storeQuota) throws Exception {
        int n = SEQ.incrementAndGet();
        User owner = new User("quota_owner" + n + "@example.com", "쿼터사장" + n);
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);

        if (plan != PlanType.FREE) {
            Subscription s = Subscription.pending(owner, plan, BillingCycle.MONTHLY, "cust_" + n);
            s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
            if (storeQuota != null) {
                Field f = Subscription.class.getDeclaredField("storeQuota");
                f.setAccessible(true);
                f.set(s, storeQuota);
            }
            subscriptionRepository.saveAndFlush(s);
        }

        UserPrincipal principal = UserPrincipal.create(owner);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @BeforeEach
    void reset() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("첫 매장은 플랜과 무관하게 항상 허용된다")
    void firstStoreIsAlwaysAllowed() throws Exception {
        authenticateWithPlan(PlanType.FREE, null);

        assertThatCode(() -> planAccessService.assertCanRegisterAdditionalStore(0))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("FREE는 2번째 매장부터 막힌다 — 기존 동작 유지")
    void freeIsBlockedFromSecondStore() throws Exception {
        authenticateWithPlan(PlanType.FREE, null);

        assertThatThrownBy(() -> planAccessService.assertCanRegisterAdditionalStore(1))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("PRO는 2곳까지 등록할 수 있다 — 요금제 화면 고지와 동일")
    void proAllowsUpToTwoStores() throws Exception {
        authenticateWithPlan(PlanType.PRO, null);

        assertThatCode(() -> planAccessService.assertCanRegisterAdditionalStore(1))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("PRO가 3번째 매장을 등록하려 하면 402로 막힌다")
    void proIsBlockedBeyondQuota() throws Exception {
        authenticateWithPlan(PlanType.PRO, null);

        assertThatThrownBy(() -> planAccessService.assertCanRegisterAdditionalStore(2))
                .isInstanceOf(PlanRequiredException.class)
                .hasMessageContaining("2곳");
    }

    @Test
    @DisplayName("PREMIUM은 매장 수 제한이 없다 — '멀티매장 무제한' 고지를 지킨다")
    void premiumHasNoStoreLimit() throws Exception {
        authenticateWithPlan(PlanType.PREMIUM, null);

        assertThatCode(() -> planAccessService.assertCanRegisterAdditionalStore(50))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("storeQuota 애드온이 있으면 그 값이 우선한다 — 기존 다점포 PRO 사장 소급 차단 방지")
    void grandfatheredQuotaWins() throws Exception {
        authenticateWithPlan(PlanType.PRO, 5);

        assertThatCode(() -> planAccessService.assertCanRegisterAdditionalStore(4))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> planAccessService.assertCanRegisterAdditionalStore(5))
                .isInstanceOf(PlanRequiredException.class);
    }
}
