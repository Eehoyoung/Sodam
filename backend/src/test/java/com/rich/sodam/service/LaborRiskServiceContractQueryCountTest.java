package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * 노무 리스크 대시보드(§3.3, query_measurement.md) — 근로계약 조회 N+1 회귀 방지 테스트.
 *
 * <p>수정 전: 활성 직원 M명을 순회하며 {@code findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc}를
 * 직원 수만큼(M회) 개별 호출했다. 수정 후에는 매장 단위 배치 조회
 * {@code findByStoreIdOrderByEmployeeIdAscCreatedAtDesc}가 정확히 1회만 실행되어야 한다.
 * 순수 성능 최적화이므로 계약 미서명 판정 결과(CONTRACT_UNSIGNED)는 수정 전후 동일해야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborRiskServiceContractQueryCountTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 7, 6);

    @Autowired private LaborRiskService service;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;
    @SpyBean private LaborContractRepository contractRepo;

    private Store store;

    @BeforeEach
    void setUp() {
        store = storeRepo.save(new Store("쿼리매장", "9990001112", "02-999-0001", "카페", 11_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    private void relate(EmployeeProfile emp, Integer customWage, LocalDate hireDate) {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, customWage);
        rel.setHireDate(hireDate);
        relRepo.save(rel);
    }

    private void signedContract(EmployeeProfile emp) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        c.setHourlyWage(11_000);
        c.markSigned(LocalDateTime.now(), null);
        contractRepo.save(c);
    }

    private void unsignedContract(EmployeeProfile emp) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        contractRepo.save(c);
    }

    @Test
    @DisplayName("직원 4명 분석 시 근로계약 조회는 매장당 배치 1회만 실행되고, 직원별 개별 조회는 호출되지 않는다")
    void contractLookupIsBatchedNotPerEmployee() {
        EmployeeProfile signed1 = employee("cq1@t.co", "서명직원1");
        relate(signed1, 11_000, MONDAY.minusMonths(1));
        signedContract(signed1);

        EmployeeProfile signed2 = employee("cq2@t.co", "서명직원2");
        relate(signed2, 11_000, MONDAY.minusMonths(1));
        signedContract(signed2);

        EmployeeProfile unsigned = employee("cq3@t.co", "미서명직원");
        relate(unsigned, 11_000, MONDAY.minusMonths(1));
        unsignedContract(unsigned);

        EmployeeProfile noContract = employee("cq4@t.co", "무계약직원");
        relate(noContract, 11_000, MONDAY.minusMonths(1));

        // 위 setup 과정의 save() 호출 기록을 지우고, analyze() 호출에서 발생하는 조회만 관찰한다.
        reset(contractRepo);

        LaborRiskResponse response = service.analyze(store.getId(), MONDAY);

        verify(contractRepo, times(1))
                .findByStoreIdOrderByEmployeeIdAscCreatedAtDesc(store.getId());
        verify(contractRepo, never())
                .findFirstByEmployeeIdAndStoreIdOrderByCreatedAtDesc(anyLong(), anyLong());

        // 판정 결과(CONTRACT_UNSIGNED 대상)는 조회 방식과 무관하게 그대로 유지되어야 한다.
        List<Item> unsignedItems = response.items().stream()
                .filter(i -> i.type() == RiskType.CONTRACT_UNSIGNED)
                .toList();
        assertThat(unsignedItems).extracting(Item::employeeId)
                .containsExactlyInAnyOrder(unsigned.getId(), noContract.getId());

        List<Item> signedEmployeesUnsignedRisk = response.items().stream()
                .filter(i -> i.type() == RiskType.CONTRACT_UNSIGNED)
                .filter(i -> i.employeeId().equals(signed1.getId()) || i.employeeId().equals(signed2.getId()))
                .toList();
        assertThat(signedEmployeesUnsignedRisk).isEmpty();
    }
}
