package com.rich.sodam.service;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 근로계약서 "발송 전에는 직원에게 안 보임" 게이트의 실제 DB 조회 검증(파생 쿼리 오타 등은
 * Mockito 단위테스트로 못 잡는다). create()만 되고 send()가 안/못 된 초안이 직원 목록·서명에
 * 노출되면 안 된다는 회귀 방지.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborContractSentGateTest {

    @Autowired
    private LaborContractService laborContractService;
    @Autowired
    private StoreRepository storeRepository;

    private LaborContract createDraft(Long employeeId, Store store) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(employeeId);
        c.setStoreId(store.getId());
        c.setHourlyWage(10_320);
        c.setWagePaymentMethod(WagePaymentMethod.BANK_TRANSFER);
        c.setWageComponents("기본급(시급) + 주휴수당");
        c.setContractedHoursPerWeek(40.0);
        c.setWorkStartTime(LocalTime.of(9, 0));
        c.setWorkEndTime(LocalTime.of(18, 0));
        c.setWeeklyHolidayDay("SUNDAY");
        c.setAnnualLeaveNote("§60에 따라 부여");
        c.setWorkLocation("소담매장 서울점");
        c.setJobDescription("홀 서빙");
        return laborContractService.save(c);
    }

    @Test
    @DisplayName("create()만 하고 발송 전이면 직원 목록에 보이지 않는다")
    void draftContract_isHiddenFromEmployeeList() {
        Store store = storeRepository.save(new Store("발송게이트매장1", "1111100001", "02-000-0000", "카페", 10_320, 100));
        createDraft(101L, store);

        List<LaborContract> my = laborContractService.findByEmployee(101L);

        assertThat(my).isEmpty();
    }

    @Test
    @DisplayName("markSent 이후에는 직원 목록에 나타난다")
    void sentContract_appearsInEmployeeList() {
        Store store = storeRepository.save(new Store("발송게이트매장2", "1111100002", "02-000-0000", "카페", 10_320, 100));
        LaborContract draft = createDraft(102L, store);

        laborContractService.markSent(draft.getId());
        List<LaborContract> my = laborContractService.findByEmployee(102L);

        assertThat(my).hasSize(1);
        assertThat(my.get(0).getId()).isEqualTo(draft.getId());
    }

    @Test
    @DisplayName("발송 전 계약을 서명하려 하면 거부된다")
    void signingDraft_isRejected() {
        Store store = storeRepository.save(new Store("발송게이트매장3", "1111100003", "02-000-0000", "카페", 10_320, 100));
        LaborContract draft = createDraft(103L, store);

        assertThatThrownBy(() -> laborContractService.sign(draft.getId(), 103L, null))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("임시저장 계약서는 findDrafts에 나타나고, 발송하면 사라진다")
    void draftAppearsUntilSent() {
        Store store = storeRepository.save(new Store("발송게이트매장4", "1111100004", "02-000-0000", "카페", 10_320, 100));
        LaborContract draft = createDraft(104L, store);

        assertThat(laborContractService.findDrafts(104L, store.getId())).extracting(LaborContract::getId)
                .containsExactly(draft.getId());

        laborContractService.markSent(draft.getId());

        assertThat(laborContractService.findDrafts(104L, store.getId())).isEmpty();
    }

    @Test
    @DisplayName("임시저장 계약서는 삭제할 수 있고, 이미 발송된 계약은 삭제가 거부된다")
    void deleteDraft_onlyBeforeSent() {
        Store store = storeRepository.save(new Store("발송게이트매장5", "1111100005", "02-000-0000", "카페", 10_320, 100));
        LaborContract draft = createDraft(105L, store);

        laborContractService.deleteDraft(draft.getId());
        assertThat(laborContractService.findDrafts(105L, store.getId())).isEmpty();

        LaborContract sent = createDraft(106L, store);
        laborContractService.markSent(sent.getId());
        assertThatThrownBy(() -> laborContractService.deleteDraft(sent.getId()))
                .isInstanceOf(IllegalStateException.class);
    }
}
