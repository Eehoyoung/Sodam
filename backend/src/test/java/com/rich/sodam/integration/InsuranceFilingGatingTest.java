package com.rich.sodam.integration;

import com.rich.sodam.controller.InsuranceFilingController;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.InsuranceFilingType;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.InsuranceFilingRequest;
import com.rich.sodam.dto.response.InsuranceFilingForm;
import com.rich.sodam.exception.PlanRequiredException;
import com.rich.sodam.repository.*;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * @RequirePlan 실 엔드포인트 게이팅 + 4대보험 신고서(주민번호 미저장) 통합 테스트.
 *
 * - FREE(구독 없음) → PRO 전용 4대보험 신고서 호출 시 PlanRequiredException(402) 차단
 * - PRO(활성 구독) → 통과, 서식 생성. 주민번호는 마스킹 표시 + 제출용 echo, 영속 미저장
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InsuranceFilingGatingTest {

    @Autowired private InsuranceFilingController controller;
    @Autowired private UserRepository userRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;

    private Long masterId;
    private Long storeId;
    private Long employeeId;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        User owner = new User("filing_owner@example.com", "사장님");
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);
        masterId = owner.getId();
        MasterProfile mp = masterProfileRepository.save(new MasterProfile(owner));

        Store store = new Store("신고서매장", "9990001112", "02-999-0000", "카페", 12_000, 100);
        store = storeRepository.save(store);
        storeId = store.getId();
        masterStoreRelationRepository.save(new MasterStoreRelation(mp, store));

        User emp = userRepository.saveAndFlush(buildEmployee());
        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(emp));
        employeeId = profile.getId();
        relationRepository.save(new EmployeeStoreRelation(profile, store, 2_500_000));

        principal = UserPrincipal.create(owner); // ROLE_MASTER 권한 포함
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private User buildEmployee() {
        User u = new User("filing_emp@example.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return u;
    }

    private void givenActivePro() {
        User owner = userRepository.findById(masterId).orElseThrow();
        Subscription s = Subscription.pending(owner, PlanType.PRO, BillingCycle.MONTHLY, "cust_pro");
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(s);
    }

    private InsuranceFilingRequest request() {
        InsuranceFilingRequest r = new InsuranceFilingRequest();
        r.setEmployeeId(employeeId);
        r.setResidentNumber("900101-1234567");
        r.setFilingType(InsuranceFilingType.ACQUISITION);
        r.setMonthlyWage(2_500_000);
        r.setEffectiveDate(LocalDate.now());
        return r;
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("FREE(구독 없음)는 4대보험 신고서(PRO) 호출이 차단된다")
    void freeBlocked() {
        assertThatThrownBy(() -> controller.generate(principal, storeId, request()))
                .isInstanceOf(PlanRequiredException.class);
    }

    @Test
    @DisplayName("PRO는 통과하고 서식이 생성된다 — 주민번호 마스킹 + 제출용 echo")
    void proPassesAndMasks() {
        givenActivePro();

        ResponseEntity<InsuranceFilingForm> res = controller.generate(principal, storeId, request());
        InsuranceFilingForm form = res.getBody();

        assertThat(form).isNotNull();
        assertThat(form.maskedResidentNumber()).isEqualTo("900101-1******");
        assertThat(form.fullResidentNumber()).isEqualTo("900101-1234567"); // 제출용 echo
        assertThat(form.lines()).hasSize(5);
        assertThat(form.disclaimer()).contains("대행하지 않");
    }
}
