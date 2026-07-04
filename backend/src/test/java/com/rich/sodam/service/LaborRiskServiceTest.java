package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.LaborInfoRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 노무 리스크 대시보드 — 리스크 타입별 검출 검증(H2).
 *
 * <p>기준일 2026-07-06(월) 고정 — 주(월~일) 경계·연도(2026 최저임금 10,320원)가 결정적이도록.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborRiskServiceTest {

    /** 2026-07-06 은 월요일. */
    private static final LocalDate MONDAY = LocalDate.of(2026, 7, 6);

    @Autowired private LaborRiskService service;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;
    @Autowired private WorkShiftRepository shiftRepo;
    @Autowired private LaborContractRepository contractRepo;
    @Autowired private LaborInfoRepository laborInfoRepo;

    private Store store;
    private int bizSeq = 0;

    @BeforeEach
    void setUp() {
        String biz = String.format("%010d", 7770001110L + (bizSeq++));
        store = storeRepo.save(new Store("리스크매장", biz, "02-777-0001", "카페", 11_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    private EmployeeStoreRelation relate(EmployeeProfile emp, Integer customWage, LocalDate hireDate) {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, customWage);
        rel.setHireDate(hireDate);
        return relRepo.save(rel);
    }

    private void confirmedShift(EmployeeProfile emp, LocalDate date, LocalTime start, LocalTime end) {
        WorkShift shift = WorkShift.create(emp.getId(), store.getId(), date, start, end, null);
        shift.confirm();
        shiftRepo.save(shift);
    }

    private void signedContract(EmployeeProfile emp) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        c.setHourlyWage(11_000);
        c.markSigned(LocalDateTime.now(), null);
        contractRepo.save(c);
    }

    private List<Item> itemsOf(RiskType type) {
        LaborRiskResponse res = service.analyze(store.getId(), MONDAY);
        return res.items().stream().filter(i -> i.type() == type).toList();
    }

    @Test
    @DisplayName("WEEKLY_15H_BOUNDARY — 이번 주 확정 시프트 합계 14시간(13~17h 구간) 직원 검출")
    void detectsWeekly15hBoundary() {
        EmployeeProfile emp = employee("risk15@t.co", "경계직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp);
        confirmedShift(emp, MONDAY, LocalTime.of(9, 0), LocalTime.of(16, 0));            // 7h
        confirmedShift(emp, MONDAY.plusDays(1), LocalTime.of(9, 0), LocalTime.of(16, 0)); // 7h → 14h

        List<Item> items = itemsOf(RiskType.WEEKLY_15H_BOUNDARY);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("14"));
        // 서명된 계약이 있으므로 계약 리스크는 없어야 한다
        assertThat(itemsOf(RiskType.CONTRACT_UNSIGNED))
                .noneMatch(i -> i.employeeId().equals(emp.getId()));
    }

    @Test
    @DisplayName("WEEKLY_52H_NEAR — 실근무+확정 시프트 합계 48시간 이상 직원 검출")
    void detectsWeekly52hNear() {
        EmployeeProfile emp = employee("risk52@t.co", "과로직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        for (int d = 0; d < 6; d++) { // 월~토 8.5h × 6 = 51h
            confirmedShift(emp, MONDAY.plusDays(d), LocalTime.of(9, 0), LocalTime.of(17, 30));
        }

        List<Item> items = itemsOf(RiskType.WEEKLY_52H_NEAR);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("51"));
    }

    @Test
    @DisplayName("CONTRACT_UNSIGNED — 근로계약서 없음/미서명 재직 직원은 DANGER 로 검출")
    void detectsUnsignedContract() {
        EmployeeProfile noContract = employee("risknc@t.co", "무계약직원");
        relate(noContract, 11_000, MONDAY.minusMonths(1));

        EmployeeProfile unsigned = employee("riskus@t.co", "미서명직원");
        relate(unsigned, 11_000, MONDAY.minusMonths(1));
        LaborContract c = new LaborContract();
        c.setEmployeeId(unsigned.getId());
        c.setStoreId(store.getId());
        contractRepo.save(c); // 미서명

        List<Item> items = itemsOf(RiskType.CONTRACT_UNSIGNED);
        assertThat(items).extracting(Item::employeeId)
                .containsExactlyInAnyOrder(noContract.getId(), unsigned.getId());
        assertThat(items).allMatch(i -> i.severity() == Severity.DANGER);
    }

    @Test
    @DisplayName("MIN_WAGE_RISK — 현행(2026: 10,320원) 미만은 DANGER, 차기년도 고시 미만은 WARN")
    void detectsMinWageRisk() {
        EmployeeProfile low = employee("risklow@t.co", "저임금직원");
        relate(low, 9_000, MONDAY.minusMonths(1)); // 현행 미만

        EmployeeProfile nextYear = employee("risknext@t.co", "차기경계직원");
        relate(nextYear, 10_500, MONDAY.minusMonths(1)); // 현행 이상, 2027 고시(10,700) 미만

        LaborInfo info = new LaborInfo();
        info.setTitle("2027 최저임금");
        info.setContent("고시");
        info.setYear(2027);
        info.setMinimumWage(10_700);
        laborInfoRepo.save(info);

        List<Item> items = itemsOf(RiskType.MIN_WAGE_RISK);
        assertThat(items).hasSize(2);
        Item danger = items.stream().filter(i -> i.employeeId().equals(low.getId())).findFirst().orElseThrow();
        assertThat(danger.severity()).isEqualTo(Severity.DANGER);
        assertThat(danger.value()).isEqualByComparingTo(new BigDecimal("9000"));
        Item warn = items.stream().filter(i -> i.employeeId().equals(nextYear.getId())).findFirst().orElseThrow();
        assertThat(warn.severity()).isEqualTo(Severity.WARN);
    }

    @Test
    @DisplayName("SEVERANCE_UPCOMING — 입사 11개월 이상 경과 직원 검출(퇴직금 채권 임박)")
    void detectsSeveranceUpcoming() {
        EmployeeProfile emp = employee("risksev@t.co", "장기근속직원");
        relate(emp, 11_000, MONDAY.minusMonths(11).minusDays(3));

        EmployeeProfile fresh = employee("riskfresh@t.co", "신입직원");
        relate(fresh, 11_000, MONDAY.minusMonths(2));

        List<Item> items = itemsOf(RiskType.SEVERANCE_UPCOMING);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("11"));
    }

    @Test
    @DisplayName("리스크가 전혀 없으면 빈 배열")
    void emptyWhenNoRisk() {
        EmployeeProfile emp = employee("risksafe@t.co", "안전직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp);

        assertThat(service.analyze(store.getId(), MONDAY).items()).isEmpty();
    }
}
