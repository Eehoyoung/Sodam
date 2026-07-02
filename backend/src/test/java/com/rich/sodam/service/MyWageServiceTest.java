package com.rich.sodam.service;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.MyWageHistoryDto;
import com.rich.sodam.dto.response.WageHistoryDto;
import com.rich.sodam.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 직원 본인 시급 이력(E-NEW-02) 통합 테스트.
 * 개별(EMPLOYEE_OVERRIDE) + 소속 매장 기본(STORE_DEFAULT) 머지·내림차순·현재 시급.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MyWageServiceTest {

    @Autowired private MyWageService myWageService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private WageHistoryRepository wageHistoryRepository;

    private int bizSeq = 0;

    private Store store(int standardWage) {
        String biz = String.format("%010d", 1112223330L + (bizSeq++));
        return storeRepository.save(new Store("시급매장", biz, "02-111-2222", "카페", standardWage, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private void relation(EmployeeProfile emp, Store store, Integer customWage) {
        EmployeeStoreRelation r = new EmployeeStoreRelation(emp, store, customWage);
        r.setIsActive(true);
        relationRepository.save(r);
    }

    @Test
    @DisplayName("개별·매장기본 시급 이력을 머지해 적용일 내림차순으로 반환")
    void mergesAndSortsDesc() {
        Store store = store(10_000);
        EmployeeProfile emp = employee("w1@x.com", "시급직원");
        relation(emp, store, 12_000);

        wageHistoryRepository.save(stamp(WageHistory.storeDefault(store, 10_000, null, "최초"),
                LocalDate.of(2026, 1, 1)));
        wageHistoryRepository.save(stamp(WageHistory.employeeOverride(store, emp, 12_000, null, "개별 인상"),
                LocalDate.of(2026, 3, 1)));
        wageHistoryRepository.save(stamp(WageHistory.storeDefault(store, 11_000, null, "기본 인상"),
                LocalDate.of(2026, 2, 1)));

        MyWageHistoryDto dto = myWageService.getMyWageHistory(emp.getId());

        List<WageHistoryDto> hist = dto.history();
        assertThat(hist).hasSize(3);
        // 내림차순: 2026-03-01 → 2026-02-01 → 2026-01-01
        assertThat(hist.get(0).effectiveFrom()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(hist.get(0).scope()).isEqualTo("EMPLOYEE_OVERRIDE");
        assertThat(hist.get(1).effectiveFrom()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(hist.get(2).effectiveFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
        // 현재 적용 시급 = 개별 12,000
        assertThat(dto.currentHourlyWage()).isEqualTo(12_000);
    }

    @Test
    @DisplayName("타 매장/타 직원 개별 이력은 섞이지 않는다(본인분만)")
    void onlyOwnOverrides() {
        Store myStore = store(10_000);
        Store otherStore = store(9_000);
        EmployeeProfile me = employee("me@x.com", "나");
        EmployeeProfile other = employee("other@x.com", "남");
        relation(me, myStore, 12_000);
        relation(other, otherStore, 13_000);

        // 내 개별 이력
        wageHistoryRepository.save(stamp(WageHistory.employeeOverride(myStore, me, 12_000, null, "내 인상"),
                LocalDate.of(2026, 2, 1)));
        // 남의 개별 이력 — 보이면 안 됨
        wageHistoryRepository.save(stamp(WageHistory.employeeOverride(otherStore, other, 13_000, null, "남 인상"),
                LocalDate.of(2026, 2, 5)));
        // 내 미소속 매장의 기본 이력 — 보이면 안 됨
        wageHistoryRepository.save(stamp(WageHistory.storeDefault(otherStore, 9_000, null, "남매장 기본"),
                LocalDate.of(2026, 1, 1)));

        MyWageHistoryDto dto = myWageService.getMyWageHistory(me.getId());

        assertThat(dto.history()).hasSize(1);
        assertThat(dto.history().get(0).reason()).isEqualTo("내 인상");
    }

    @Test
    @DisplayName("소속 매장 없으면 빈 이력·현재 시급 null")
    void noRelation() {
        EmployeeProfile orphan = employee("orphan@x.com", "무소속");
        MyWageHistoryDto dto = myWageService.getMyWageHistory(orphan.getId());
        assertThat(dto.history()).isEmpty();
        assertThat(dto.currentHourlyWage()).isNull();
    }

    /** WageHistory.effectiveFrom 은 팩토리에서 now() 로 고정되므로 테스트용으로 날짜를 덮어쓴다. */
    private WageHistory stamp(WageHistory h, LocalDate effectiveFrom) {
        org.springframework.test.util.ReflectionTestUtils.setField(h, "effectiveFrom", effectiveFrom);
        return h;
    }
}
