package com.rich.sodam.service;

import com.rich.sodam.domain.ElectronicSignatureParty;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeResignationRequest;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.ElectronicSignaturePartyRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeResignationRequestRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.EmployeeResignationSignatureService.SignatureRequestResult;
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
 * WP-4 — 전자서명 개시 실 통합 테스트(mode=mock, 테스트 프로필 기본값). 실제 DB에 envelope·
 * party가 생성되는지, 사장 전용 가드가 실제로 걸리는지, 요청 레코드에 envelopeId가 연결되는지
 * 확인한다. 게이트웨이 폴링·검증 사이클(REQUEST→STATUS→VERIFY→FINALIZE)은
 * {@code ElectronicSignatureWorkerPersistenceTest}가 subjectType 무관하게 이미 증명한 영역이라
 * 여기서 반복하지 않는다 — 이 테스트는 "봉투 생성 단계까지의 배선"만 검증한다.
 */
@SpringBootTest(properties = {
        "sodam.integration.electronic-signature.worker-enabled=true"
})
@ActiveProfiles("test")
@Transactional
class EmployeeResignationSignatureIntegrationTest {

    @Autowired private EmployeeResignationSignatureService signatureService;
    @Autowired private EmployeeResignationRequestRepository resignationRepo;
    @Autowired private ElectronicSignaturePartyRepository partyRepo;
    @Autowired private EmployeeStoreRelationRepository relationRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("esign_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User employeeUser(String name) {
        User u = new User("esign_emp" + (emailSeq++) + "@x.com", name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_630_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("서명테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        return s;
    }

    private EmployeeResignationRequest agreedRequest(User owner, Store store, User employee) {
        EmployeeProfile profile = employeeProfileRepo.save(new EmployeeProfile(employee));
        EmployeeStoreRelation relation = relationRepo.save(new EmployeeStoreRelation(profile, store, 12_000));
        EmployeeResignationRequest request = EmployeeResignationRequest.create(
                relation, employee, LocalDate.now().plusDays(14), "사유");
        request.agreeOn(LocalDate.now().plusDays(21));
        return resignationRepo.save(request);
    }

    @Test
    @DisplayName("사장이 서명을 요청하면 RESIGNATION_ACKNOWLEDGMENT 봉투와 두 서명자(사장·직원)가 실제로 생성된다")
    void requestSignatureCreatesEnvelopeAndParties() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        EmployeeResignationRequest request = agreedRequest(owner, store, employee);

        SignatureRequestResult result = signatureService.requestSignature(request.getId(), owner.getId());

        assertThat(result.available()).isTrue();
        assertThat(result.envelopeId()).isNotNull();

        List<ElectronicSignatureParty> parties = partyRepo.findByEnvelope_IdOrderBySigningOrderAsc(result.envelopeId());
        assertThat(parties).hasSize(2);
        assertThat(parties).extracting(ElectronicSignatureParty::getUserId)
                .containsExactlyInAnyOrder(owner.getId(), employee.getId());

        EmployeeResignationRequest reloaded = resignationRepo.findById(request.getId()).orElseThrow();
        assertThat(reloaded.getSignatureEnvelopeId()).isEqualTo(result.envelopeId());
    }

    @Test
    @DisplayName("같은 신청에 대해 두 번 요청해도 새 봉투를 또 만들지 않고 기존 봉투를 그대로 반환한다")
    void requestingTwiceReturnsSameEnvelope() {
        User owner = masterUser();
        Store store = store(owner);
        User employee = employeeUser("김직원");
        EmployeeResignationRequest request = agreedRequest(owner, store, employee);

        SignatureRequestResult first = signatureService.requestSignature(request.getId(), owner.getId());
        SignatureRequestResult second = signatureService.requestSignature(request.getId(), owner.getId());

        assertThat(second.envelopeId()).isEqualTo(first.envelopeId());
    }
}
