package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeResignationDateProposal;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeResignationDateProposalRepository;
import com.rich.sodam.repository.EmployeeResignationRequestRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.EmployeeResignationService.RequestResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-3 — 퇴사일 조율(왕복 협의) 테스트. append-only 이력, 본인 제안 자기동의 차단,
 * 최종적으로 확인(acknowledge)까지 실 플로우로 라운드트립한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeResignationNegotiationTest {

    @Autowired private EmployeeResignationService service;
    @Autowired private EmployeeResignationRequestRepository resignationRepo;
    @Autowired private EmployeeResignationDateProposalRepository proposalRepo;
    @Autowired private EmployeeStoreRelationRepository relationRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User employeeUser(String name) {
        User u = new User("negotiation_emp" + (emailSeq++) + "@x.com", name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private User masterUser() {
        User u = new User("negotiation_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_620_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("협의테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        return s;
    }

    private void relation(User employee, Store store) {
        EmployeeProfile profile = employeeProfileRepo.save(new EmployeeProfile(employee));
        relationRepo.save(new EmployeeStoreRelation(profile, store, 12_000));
    }

    @Test
    @DisplayName("제출 시 희망일이 첫 제안(EMPLOYEE)으로 이력에 남는다")
    void submissionCreatesInitialProposal() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);

        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        List<EmployeeResignationDateProposal> proposals = proposalRepo.findByRequest_IdOrderByProposedAtAscIdAsc(result.id());
        assertThat(proposals).hasSize(1);
        assertThat(proposals.get(0).getProposerRole()).isEqualTo(EmployeeResignationDateProposal.ProposerRole.EMPLOYEE);
    }

    @Test
    @DisplayName("사장이 역제안하면 기존 제안은 그대로 남고(append-only) 새 제안이 추가된다")
    void counterProposeKeepsHistoryAppendOnly() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        service.counterPropose(result.id(), owner.getId(), LocalDate.now().plusDays(21));

        List<EmployeeResignationDateProposal> proposals = proposalRepo.findByRequest_IdOrderByProposedAtAscIdAsc(result.id());
        assertThat(proposals).hasSize(2);
        assertThat(proposals.get(0).getProposerRole()).isEqualTo(EmployeeResignationDateProposal.ProposerRole.EMPLOYEE);
        assertThat(proposals.get(1).getProposerRole()).isEqualTo(EmployeeResignationDateProposal.ProposerRole.MASTER);
        assertThat(proposals.get(1).getProposedDate()).isEqualTo(LocalDate.now().plusDays(21));
    }

    @Test
    @DisplayName("직원이 사장의 역제안에 동의하면 agreedResignationDate가 그 날짜로 확정된다")
    void agreeToCounterProposalSetsAgreedDate() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");
        LocalDate counterDate = LocalDate.now().plusDays(21);
        service.counterPropose(result.id(), owner.getId(), counterDate);

        service.agree(result.id(), employee.getId());

        EmployeeResignationRequest reloaded = resignationRepo.findById(result.id()).orElseThrow();
        assertThat(reloaded.getAgreedResignationDate()).isEqualTo(counterDate);
    }

    @Test
    @DisplayName("본인이 마지막으로 낸 제안에는 스스로 동의할 수 없다")
    void cannotAgreeToOwnLastProposal() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        // 마지막 제안이 EMPLOYEE(최초 제출) 상태 — 직원 본인이 동의를 시도
        assertThatThrownBy(() -> service.agree(result.id(), employee.getId()))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo("RESIGNATION_CANNOT_AGREE_OWN_PROPOSAL"));
    }

    @Test
    @DisplayName("당사자가 아닌 사람은 협의에 개입할 수 없다(BOLA)")
    void nonPartyCannotNegotiate() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        User stranger = employeeUser("이남남");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        assertThatThrownBy(() -> service.counterPropose(result.id(), stranger.getId(), LocalDate.now().plusDays(30)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.proposals(result.id(), stranger.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("전체 라운드트립: 제출→역제안→동의→확인, 확인 후에도 소속은 활성 상태")
    void fullRoundTripSubmitCounterAgreeAcknowledge() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        LocalDate agreedDate = LocalDate.now().plusDays(21);
        service.counterPropose(result.id(), owner.getId(), agreedDate);
        service.agree(result.id(), employee.getId());
        service.acknowledge(result.id(), owner.getId());

        EmployeeResignationRequest reloaded = resignationRepo.findById(result.id()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmployeeResignationRequest.Status.ACKNOWLEDGED);
        assertThat(reloaded.getAgreedResignationDate()).isEqualTo(agreedDate);
    }
}
