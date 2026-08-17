package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.EmployeeProfileRepository;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-1 — 직원 사직서 제출·철회·사장 확인(EmployeeResignationService) 테스트.
 * 협의 확정(agreedResignationDate)은 WP-3에서 실 API가 생기므로, 여기서는
 * ReflectionTestUtils로 직접 채워 확인(acknowledge) 경로를 독립적으로 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeeResignationServiceTest {

    @Autowired private EmployeeResignationService service;
    @Autowired private EmployeeResignationRequestRepository resignationRepo;
    @Autowired private EmployeeStoreRelationRepository relationRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User employeeUser(String name) {
        User u = new User("resign_emp" + (emailSeq++) + "@x.com", name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private User masterUser() {
        User u = new User("resign_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_610_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("퇴사테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        return s;
    }

    private EmployeeStoreRelation relation(User employee, Store store) {
        EmployeeProfile profile = employeeProfileRepo.save(new EmployeeProfile(employee));
        return relationRepo.save(new EmployeeStoreRelation(profile, store, 12_000));
    }

    @Test
    @DisplayName("본인 소속에 사직서를 제출하면 PENDING으로 생성되고 사장에게 알림이 간다")
    void requestCreatesPending() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);

        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "개인 사정으로 퇴사합니다");

        assertThat(result.forbidden()).isFalse();
        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(resignationRepo.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("본인 소속이 아닌 매장에 신청하면 forbidden 처리된다")
    void requestToOtherStoreForbidden() {
        User owner = masterUser();
        Store myStore = store(owner);
        Store otherStore = store(masterUser());
        User employee = employeeUser("김직원");
        relation(employee, myStore);

        RequestResult result = service.requestResignation(otherStore.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        assertThat(result.forbidden()).isTrue();
        assertThat(resignationRepo.findAll()).isEmpty();
    }

    @Test
    @DisplayName("이미 비활성 소속에는 신청할 수 없다")
    void requestOnInactiveRelationRejected() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        EmployeeStoreRelation rel = relation(employee, store);
        rel.changeActive(false);
        relationRepo.saveAndFlush(rel);

        assertThatThrownBy(() -> service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("RESIGNATION_RELATION_INACTIVE"));
    }

    @Test
    @DisplayName("이미 대기 중인 신청이 있으면 중복 제출이 거부된다")
    void duplicatePendingRejected() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        service.requestResignation(store.getId(), employee.getId(), LocalDate.now().plusDays(14), "사유1");

        assertThatThrownBy(() -> service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(20), "사유2"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("RESIGNATION_ALREADY_PENDING"));
    }

    @Test
    @DisplayName("신청자 본인은 대기 중인 신청을 철회할 수 있다")
    void withdrawByRequesterSucceeds() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        service.withdraw(result.id(), employee.getId());

        EmployeeResignationRequest reloaded = resignationRepo.findById(result.id()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmployeeResignationRequest.Status.WITHDRAWN);
    }

    @Test
    @DisplayName("타인의 신청은 철회할 수 없다(403)")
    void withdrawByOthersForbidden() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        User stranger = employeeUser("이남남");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        assertThatThrownBy(() -> service.withdraw(result.id(), stranger.getId()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("협의(agreedResignationDate)가 확정되지 않으면 확인할 수 없다")
    void acknowledgeWithoutAgreedDateRejected() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        assertThatThrownBy(() -> service.acknowledge(result.id(), owner.getId()))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("RESIGNATION_DATE_NOT_AGREED"));
    }

    @Test
    @DisplayName("확인(acknowledge)은 협의 확정 후 상태만 바꾸고 비활성화하지 않는다(HC-2 핵심 검증)")
    void acknowledgeDoesNotDeactivateRelation() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        EmployeeStoreRelation rel = relation(employee, store);
        RequestResult result = service.requestResignation(store.getId(), employee.getId(),
                LocalDate.now().plusDays(14), "사유");

        EmployeeResignationRequest request = resignationRepo.findById(result.id()).orElseThrow();
        ReflectionTestUtils.setField(request, "agreedResignationDate", LocalDate.now().plusDays(14));
        resignationRepo.saveAndFlush(request);

        service.acknowledge(result.id(), owner.getId());

        EmployeeResignationRequest reloaded = resignationRepo.findById(result.id()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(EmployeeResignationRequest.Status.ACKNOWLEDGED);
        EmployeeStoreRelation reloadedRelation = relationRepo.findById(rel.getId()).orElseThrow();
        assertThat(reloadedRelation.getIsActive()).isTrue(); // 여전히 활성 — 비활성화는 별도 API
    }
}
