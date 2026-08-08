package com.rich.sodam.integration;

import com.rich.sodam.controller.TaxStatementController;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.security.UserPrincipal;
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

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-D — 법정 기한 안내 무료 개방 검증.
 *
 * <p>가르는 기준은 <b>금액을 만지는가</b>다. 기한·D-day 는 달력 계산이라 무료로 열어도 잃을 매출이
 * 없지만, 금액 집계는 급여 확정 데이터를 읽는 유료 영역이다. 이 테스트는 그 경계가 실제로
 * 지켜지는지 — FREE 로 기한은 되고 금액은 402 로 막히는지 — 를 고정한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TaxDeadlineFreeAccessTest {

    @Autowired private TaxStatementController controller;
    @Autowired private UserRepository userRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;

    private Long storeId;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        User owner = new User("taxdeadline_owner@example.com", "무료사장");
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);
        MasterProfile mp = masterProfileRepository.save(new MasterProfile(owner));

        Store store = storeRepository.save(
                new Store("기한매장", "9990002223", "02-999-0001", "카페", 12_000, 100));
        storeId = store.getId();
        masterStoreRelationRepository.save(new MasterStoreRelation(mp, store));

        principal = UserPrincipal.create(owner);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        // 구독을 만들지 않는다 = FREE 상태.
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("FREE도 원천세 신고기한은 볼 수 있다 — 금액 없이 기한·D-day만")
    void freeCanSeeWithholdingDeadline() {
        var body = controller.withholdingDeadline(principal, storeId, 2026, 6).getBody();

        assertThat(body).isNotNull();
        assertThat(body.dueDate()).isEqualTo(LocalDate.of(2026, 7, 10));
        assertThat(body.disclaimer()).isNotBlank();
    }

    @Test
    @DisplayName("FREE도 부가세 분기 신고기한은 볼 수 있다")
    void freeCanSeeVatDeadline() {
        var body = controller.vatDeadline(principal, storeId).getBody();

        assertThat(body).isNotNull();
        assertThat(body.dueDate()).isNotNull();
        assertThat(body.quarter()).isNotBlank();
    }

    @Test
    @DisplayName("금액이 들어간 원천세 월 요약은 FREE에서 402로 막힌다 — 유료 영역이 새지 않는다")
    void freeIsBlockedFromWithholdingAmounts() {
        assertThatThrownBy(() -> controller.withholdingMonthly(principal, storeId, 2026, 6))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("간이지급명세서·상시근로자 추이도 FREE에서 막힌다")
    void freeIsBlockedFromPaidAggregations() {
        assertThatThrownBy(() -> controller.withholdingStatement(principal, storeId, 2026))
                .isInstanceOf(PlanRequiredException.class);
        assertThatThrownBy(() -> controller.headcountTrend(principal, storeId, 2026))
                .isInstanceOf(PlanRequiredException.class);
    }
}
