package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.MyLeaveBalanceDto;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 직원 본인 잔여 연차(E-NEW-03) 통합 테스트.
 * 발생(AnnualLeaveCalculator) − 승인된 TimeOff 사용일수 = 잔여. 5인 미만 분기.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MyLeaveBalanceServiceTest {

    @Autowired private MyLeaveBalanceService myLeaveBalanceService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private TimeOffRepository timeOffRepository;

    private Store store() {
        return storeRepository.save(new Store("연차매장", "1112223334", "02-111-2222", "카페", 12_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private EmployeeProfile relation(Store store, String email, String name, LocalDate hire) {
        EmployeeProfile emp = employee(email, name);
        EmployeeStoreRelation r = new EmployeeStoreRelation(emp, store, 12_000);
        r.setHireDate(hire);
        r.setIsActive(true);
        relationRepository.save(r);
        return emp;
    }

    private void approvedTimeOff(EmployeeProfile emp, Store store, LocalDate start, LocalDate end) {
        TimeOff t = new TimeOff(emp, store, start, end, "연차");
        t.approve();
        timeOffRepository.save(t);
    }

    @Test
    @DisplayName("5인 이상·1년 이상: 발생 15 − 승인 휴가 3일 = 잔여 12")
    void remainingAfterApprovedUsage() {
        Store store = store();
        EmployeeProfile me = relation(store, "lb1@x.com", "1년차",
                LocalDate.now().minusYears(1).minusDays(10));
        // 5인 채우기
        for (int i = 2; i <= 5; i++) {
            relation(store, "lbf" + i + "@x.com", "동료" + i, LocalDate.now().minusMonths(2));
        }
        // 승인 휴가 3일(5/1~5/3 포함)
        approvedTimeOff(me, store, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3));

        MyLeaveBalanceDto dto = myLeaveBalanceService.getMyLeaveBalance(me.getId());

        assertThat(dto.fiveOrMoreApplicable()).isTrue();
        assertThat(dto.entitledDays()).isEqualTo(15);
        assertThat(dto.usedDays()).isEqualTo(3);
        assertThat(dto.remainingDays()).isEqualTo(12);
        assertThat(dto.disclaimer()).isNotBlank();
    }

    @Test
    @DisplayName("5인 미만: 연차 미적용(발생·잔여 0, fiveOrMore=false)")
    void underFiveNotApplicable() {
        Store store = store();
        EmployeeProfile me = relation(store, "solo@x.com", "혼자",
                LocalDate.now().minusYears(2));

        MyLeaveBalanceDto dto = myLeaveBalanceService.getMyLeaveBalance(me.getId());

        assertThat(dto.fiveOrMoreApplicable()).isFalse();
        assertThat(dto.entitledDays()).isZero();
        assertThat(dto.remainingDays()).isZero();
    }

    @Test
    @DisplayName("승인되지 않은(PENDING) 휴가는 사용일수에 포함되지 않는다")
    void pendingNotCounted() {
        Store store = store();
        EmployeeProfile me = relation(store, "pend@x.com", "대기직원",
                LocalDate.now().minusYears(1).minusDays(10));
        for (int i = 2; i <= 5; i++) {
            relation(store, "pf" + i + "@x.com", "동료" + i, LocalDate.now().minusMonths(2));
        }
        // PENDING (approve 호출 안 함)
        TimeOff pending = new TimeOff(me, store, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 4), "신청만");
        timeOffRepository.save(pending);

        MyLeaveBalanceDto dto = myLeaveBalanceService.getMyLeaveBalance(me.getId());

        assertThat(dto.usedDays()).isZero();
        assertThat(dto.remainingDays()).isEqualTo(15);
    }
}
