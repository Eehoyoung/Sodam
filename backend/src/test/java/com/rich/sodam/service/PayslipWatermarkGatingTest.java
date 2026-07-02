package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 명세서 PDF 게이팅(STARTER) — 매장 사장 플랜 기준 워터마크 결정 + 양 경로 PDF 생성 검증.
 * 하드 차단(402)이 아니라 워터마크로 처리하므로 직원 본인 조회는 항상 가능(PDF non-empty).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayslipWatermarkGatingTest {

    @Autowired private PayrollService payrollService;
    @Autowired private PlanAccessService planAccessService;
    @Autowired private UserRepository userRepository;
    @Autowired private MasterProfileRepository masterProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private PayrollRepository payrollRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;

    private Long seedStoreWithOwner(PlanType ownerPlan) {
        User owner = new User("pw_owner_" + ownerPlan + "@x.com", "사장님");
        owner.setUserGrade(UserGrade.MASTER);
        owner = userRepository.saveAndFlush(owner);
        MasterProfile mp = masterProfileRepository.save(new MasterProfile(owner));

        Store store = storeRepository.save(new Store("명세서매장" + ownerPlan, "1112223334", "02-1", "카페", 12_000, 100));
        masterStoreRelationRepository.save(new MasterStoreRelation(mp, store));

        if (ownerPlan != PlanType.FREE) {
            Subscription s = Subscription.pending(owner, ownerPlan, BillingCycle.MONTHLY, "cust_" + ownerPlan);
            s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
            subscriptionRepository.save(s);
        }
        return store.getId();
    }

    private Long seedPayroll(Long storeId) {
        Store store = storeRepository.findById(storeId).orElseThrow();
        User empUser = userRepository.saveAndFlush(employeeUser());
        EmployeeProfile emp = employeeProfileRepository.save(new EmployeeProfile(empUser));
        relationRepository.save(new EmployeeStoreRelation(emp, store, 12_000));

        Payroll p = new Payroll();
        p.setStore(store);
        p.setEmployee(emp);
        p.setStartDate(YearMonth.now().atDay(1));
        p.setEndDate(YearMonth.now().atEndOfMonth());
        p.setGrossWage(1_200_000);
        p.setNetWage(1_100_000);
        return payrollRepository.save(p).getId();
    }

    private User employeeUser() {
        User u = new User("pw_emp_" + System.nanoTime() + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return u;
    }

    @Test
    @DisplayName("FREE 사장 매장: PAYSLIP_PDF 미보유 → 워터마크 경로, PDF는 생성됨")
    void freeOwnerWatermarked() {
        Long storeId = seedStoreWithOwner(PlanType.FREE);
        Long payrollId = seedPayroll(storeId);

        assertThat(planAccessService.storeOwnerHasFeature(storeId, PlanFeature.PAYSLIP_PDF)).isFalse();
        byte[] pdf = payrollService.generatePayrollPdf(payrollId);
        assertThat(pdf).isNotNull().isNotEmpty();
    }

    @Test
    @DisplayName("STARTER 사장 매장: PAYSLIP_PDF 보유 → 정식 발급(워터마크 없음), PDF 생성됨")
    void starterOwnerClean() {
        Long storeId = seedStoreWithOwner(PlanType.STARTER);
        Long payrollId = seedPayroll(storeId);

        assertThat(planAccessService.storeOwnerHasFeature(storeId, PlanFeature.PAYSLIP_PDF)).isTrue();
        byte[] pdf = payrollService.generatePayrollPdf(payrollId);
        assertThat(pdf).isNotNull().isNotEmpty();
    }
}
