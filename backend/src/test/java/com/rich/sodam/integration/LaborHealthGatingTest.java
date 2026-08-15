package com.rich.sodam.integration;

import com.rich.sodam.controller.LaborHealthController;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.LaborHealthResponse;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 노무 건강도 대시보드(WP-7) — @RequirePlan 실 엔드포인트 게이팅 통합 테스트.
 *
 * <p>FREE(구독 없음) → 요약·상세 둘 다 402(PLAN_REQUIRED). STARTER(LABOR_LAW_BASIC만) → 요약은
 * 통과하되 상세는 402("PRO 필드"를 FREE/STARTER가 요청 시 402 요구사항). PRO(LABOR_LAW_FULL) →
 * 둘 다 통과하고 상세에는 message가 채워진다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborHealthGatingTest {

    @Autowired private LaborHealthController controller;
    @Autowired private UserRepository userRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;

    private Long masterId;
    private Long storeId;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        User owner = new User("health_owner@example.com", "사장님");
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);
        masterId = owner.getId();
        MasterProfile mp = masterProfileRepository.save(new MasterProfile(owner));

        Store store = new Store("건강도매장", "9990002220", "02-999-1111", "카페", 11_000, 100);
        store = storeRepository.save(store);
        storeId = store.getId();
        masterStoreRelationRepository.save(new MasterStoreRelation(mp, store));

        // DANGER 1건(계약서 미서명)을 만들어 점수·건수 계산 대상이 존재하게 한다.
        User emp = new User("health_emp@example.com", "직원");
        emp.setUserGrade(UserGrade.EMPLOYEE);
        emp = userRepository.saveAndFlush(emp);
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(emp));
        relationRepository.save(new EmployeeStoreRelation(profile, store, 11_000));

        principal = UserPrincipal.create(owner);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void givenActivePlan(PlanType plan) {
        User owner = userRepository.findById(masterId).orElseThrow();
        Subscription s = Subscription.pending(owner, plan, BillingCycle.MONTHLY, "cust_" + plan.name());
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(s);
    }

    @Test
    @DisplayName("FREE(구독 없음) — 요약(LABOR_LAW_BASIC)도 402")
    void freeBlockedFromSummary() {
        assertThatThrownBy(() -> controller.summary(principal, storeId))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("FREE(구독 없음) — 상세(LABOR_LAW_FULL, PRO 전용 필드)도 402")
    void freeBlockedFromDetail() {
        assertThatThrownBy(() -> controller.detail(principal, storeId))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("STARTER(LABOR_LAW_BASIC 보유) — 요약은 통과하고 건수만 담긴다(message 없음)")
    void starterPassesSummaryOnly() {
        givenActivePlan(PlanType.STARTER);

        ResponseEntity<LaborHealthResponse> res = controller.summary(principal, storeId);

        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().needsAttentionCount()).isGreaterThan(0);
        assertThat(res.getBody().items()).allMatch(i -> i.message() == null);
    }

    @Test
    @DisplayName("STARTER(LABOR_LAW_FULL 미보유) — 상세 요청(PRO 필드) 시 402")
    void starterBlockedFromDetail() {
        givenActivePlan(PlanType.STARTER);

        assertThatThrownBy(() -> controller.detail(principal, storeId))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("PRO(LABOR_LAW_FULL 보유) — 상세 요청 시 message까지 채워진다")
    void proPassesDetailWithMessage() {
        givenActivePlan(PlanType.PRO);

        ResponseEntity<LaborHealthResponse> res = controller.detail(principal, storeId);

        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().items()).isNotEmpty();
        assertThat(res.getBody().items()).allMatch(i -> i.message() != null && !i.message().isBlank());
    }

    @Test
    @DisplayName("PRO — DANGER 1건만 있을 때 점수는 100-15=85")
    void scoreReflectsSingleDangerPenalty() {
        givenActivePlan(PlanType.PRO);

        ResponseEntity<LaborHealthResponse> res = controller.summary(principal, storeId);

        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().dangerCount()).isEqualTo(1); // 근로계약서 미서명(CONTRACT_UNSIGNED)
        assertThat(res.getBody().warnCount()).isZero();
        assertThat(res.getBody().score()).isEqualTo(85);
    }
}
