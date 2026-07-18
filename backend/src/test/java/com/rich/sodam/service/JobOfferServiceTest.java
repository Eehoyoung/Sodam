package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobOfferCreateRequest;
import com.rich.sodam.dto.response.JobOfferResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobOfferRepository;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 채용 제안(JobOffer) 서비스 테스트 — 상태머신·만료 경계·유형 매칭·PII·afterCommit
 * (260711_작업통합.md Part 2 §15.6).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobOfferServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired private JobOfferService service;
    @Autowired private JobOfferRepository jobOfferRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private JobSeekingProfileRepository jobSeekingProfileRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    // ─────────────────────────────────────────────────────────────────
    // 픽스처 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private User employeeUser(String label) {
        User u = new User(label + (emailSeq++) + "@x.com", "구직자");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private User masterUser(String label) {
        User u = new User(label + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_310_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("제안테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        s = storeRepo.save(s);
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        return s;
    }

    private void grantEligibility(User u, Store store) {
        EmployeeProfile emp = employeeProfileRepo.save(new EmployeeProfile(u));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private JobSeekingProfile seekingProfile(User u, List<String> types) {
        JobSeekingProfile profile = new JobSeekingProfile(u);
        profile.updateSeekingTypes(types);
        profile.turnOn();
        return jobSeekingProfileRepo.save(profile);
    }

    private JobOfferCreateRequest regularRequest(Long targetUserId) {
        return new JobOfferCreateRequest(targetUserId, "REGULAR", null,
                LocalTime.of(10, 0), LocalTime.of(18, 0), 12_000, "정기로 일해주세요");
    }

    private JobOfferCreateRequest substituteRequest(Long targetUserId, LocalDate workDate, LocalTime startTime) {
        return new JobOfferCreateRequest(targetUserId, "SUBSTITUTE", workDate, startTime,
                startTime.plusHours(4), 13_000, "오늘 대타 가능하신가요");
    }

    private String errorCode(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    // ─────────────────────────────────────────────────────────────────
    // 발송 — 성공/유형 매칭/구직 여부
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("정상 발송 — PENDING 생성, storeCode 미포함")
    void sendOffer_success() {
        User owner = masterUser("owner_offer");
        Store store = store(owner);
        User target = employeeUser("target_offer");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR", "SUBSTITUTE"));

        JobOfferResponse resp = service.sendOffer(store.getId(), regularRequest(target.getId()));

        assertThat(resp.status()).isEqualTo("PENDING");
        assertThat(resp.storeCode()).isNull();
        assertThat(jobOfferRepo.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("구직 OFF 대상에게 발송 → OFFER_TARGET_NOT_SEEKING 400")
    void sendOffer_targetNotSeeking_throws() {
        User owner = masterUser("owner_offer2");
        Store store = store(owner);
        User target = employeeUser("target_offer2");
        grantEligibility(target, store);
        // 구직 프로필 없음(OFF) — turnOn 호출하지 않음

        assertThatThrownBy(() -> service.sendOffer(store.getId(), regularRequest(target.getId())))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("OFFER_TARGET_NOT_SEEKING"));
    }

    @Test
    @DisplayName("정기만 구직중인 대상에게 대타 제안 → OFFER_TYPE_MISMATCH 400")
    void sendOffer_typeMismatch_throws() {
        User owner = masterUser("owner_offer3");
        Store store = store(owner);
        User target = employeeUser("target_offer3");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferCreateRequest req = substituteRequest(target.getId(), LocalDate.now(SEOUL).plusDays(1), LocalTime.of(9, 0));

        assertThatThrownBy(() -> service.sendOffer(store.getId(), req))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("OFFER_TYPE_MISMATCH"));
    }

    // ─────────────────────────────────────────────────────────────────
    // 중복/재발송
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("같은 매장→같은 구직자 대기중 제안 존재 시 재발송 → OFFER_ALREADY_PENDING 409")
    void sendOffer_duplicatePending_throws() {
        User owner = masterUser("owner_offer4");
        Store store = store(owner);
        User target = employeeUser("target_offer4");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        service.sendOffer(store.getId(), regularRequest(target.getId()));

        assertThatThrownBy(() -> service.sendOffer(store.getId(), regularRequest(target.getId())))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("OFFER_ALREADY_PENDING"));
    }

    @Test
    @DisplayName("만료된 대기중 제안이 있어도 재발송은 허용된다(lazy 만료 해제)")
    void sendOffer_afterExpiry_allowsResend() {
        User owner = masterUser("owner_offer5");
        Store store = store(owner);
        User target = employeeUser("target_offer5");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse first = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOffer persisted = jobOfferRepo.findById(first.id()).orElseThrow();
        ReflectionTestUtils.setField(persisted, "expiresAt", LocalDateTime.now(SEOUL).minusSeconds(1));
        jobOfferRepo.saveAndFlush(persisted);

        JobOfferResponse second = service.sendOffer(store.getId(), regularRequest(target.getId()));
        assertThat(second.status()).isEqualTo("PENDING");
        assertThat(jobOfferRepo.findById(first.id()).orElseThrow().getStatus().name()).isEqualTo("EXPIRED");
    }

    @Test
    @DisplayName("거절 후에는 같은 대상에게 재발송이 가능하다")
    void sendOffer_afterDecline_allowsResend() {
        User owner = masterUser("owner_offer6");
        Store store = store(owner);
        User target = employeeUser("target_offer6");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse first = service.sendOffer(store.getId(), regularRequest(target.getId()));
        service.respondToOffer(first.id(), target.getId(), false);

        JobOfferResponse second = service.sendOffer(store.getId(), regularRequest(target.getId()));
        assertThat(second.status()).isEqualTo("PENDING");
    }

    // ─────────────────────────────────────────────────────────────────
    // 만료 경계 계산 — REGULAR=+24h, SUBSTITUTE=min(+24h, 근무시작)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("REGULAR 제안 만료시각은 생성+24h")
    void sendOffer_regular_expiresIn24h() {
        User owner = masterUser("owner_offer7");
        Store store = store(owner);
        User target = employeeUser("target_offer7");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        LocalDateTime before = LocalDateTime.now(SEOUL).plusHours(24);
        JobOfferResponse resp = service.sendOffer(store.getId(), regularRequest(target.getId()));
        LocalDateTime after = LocalDateTime.now(SEOUL).plusHours(24);

        assertThat(resp.expiresAt()).isBetween(before.minusSeconds(2), after.plusSeconds(2));
    }

    @Test
    @DisplayName("SUBSTITUTE 제안 — 근무 시작이 24h 이내면 만료시각=근무 시작 시각")
    void sendOffer_substitute_expiresAtWorkStart_whenSooner() {
        User owner = masterUser("owner_offer8");
        Store store = store(owner);
        User target = employeeUser("target_offer8");
        grantEligibility(target, store);
        seekingProfile(target, List.of("SUBSTITUTE"));

        LocalDateTime workStart = LocalDateTime.now(SEOUL).plusHours(12).withNano(0);
        LocalDate workDate = workStart.toLocalDate();
        LocalTime startTime = workStart.toLocalTime();
        JobOfferResponse resp = service.sendOffer(store.getId(), substituteRequest(target.getId(), workDate, startTime));

        assertThat(resp.expiresAt()).isEqualTo(workStart);
    }

    @Test
    @DisplayName("SUBSTITUTE 제안 — 근무 시작이 24h 이후면 만료시각=생성+24h")
    void sendOffer_substitute_expiresIn24h_whenWorkStartFar() {
        User owner = masterUser("owner_offer9");
        Store store = store(owner);
        User target = employeeUser("target_offer9");
        grantEligibility(target, store);
        seekingProfile(target, List.of("SUBSTITUTE"));

        LocalDate workDate = LocalDate.now(SEOUL).plusDays(10);
        LocalTime startTime = LocalTime.of(9, 0);
        LocalDateTime before = LocalDateTime.now(SEOUL).plusHours(24);
        JobOfferResponse resp = service.sendOffer(store.getId(), substituteRequest(target.getId(), workDate, startTime));
        LocalDateTime after = LocalDateTime.now(SEOUL).plusHours(24);

        assertThat(resp.expiresAt()).isBetween(before.minusSeconds(2), after.plusSeconds(2));
    }

    // ─────────────────────────────────────────────────────────────────
    // getMyOffers — lazy 만료 판정(±1s 경계), PENDING 우선 정렬, DB 미변경
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("만료 시각 1초 지난 PENDING 제안 조회 → 응답상 EXPIRED, DB 원본은 그대로 PENDING(배치 없음)")
    void getMyOffers_lazyExpiry_doesNotMutateDb() {
        User owner = masterUser("owner_offer10");
        Store store = store(owner);
        User target = employeeUser("target_offer10");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOffer persisted = jobOfferRepo.findById(created.id()).orElseThrow();
        ReflectionTestUtils.setField(persisted, "expiresAt", LocalDateTime.now(SEOUL).minusSeconds(1));
        jobOfferRepo.saveAndFlush(persisted);

        List<JobOfferResponse> list = service.getMyOffers(target.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).status()).isEqualTo("EXPIRED");
        assertThat(jobOfferRepo.findById(created.id()).orElseThrow().getStatus().name()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("만료 1초 전(아직 유효) PENDING 제안 → 응답상 PENDING 유지")
    void getMyOffers_notYetExpired_staysPending() {
        User owner = masterUser("owner_offer11");
        Store store = store(owner);
        User target = employeeUser("target_offer11");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOffer persisted = jobOfferRepo.findById(created.id()).orElseThrow();
        ReflectionTestUtils.setField(persisted, "expiresAt", LocalDateTime.now(SEOUL).plusSeconds(1));
        jobOfferRepo.saveAndFlush(persisted);

        List<JobOfferResponse> list = service.getMyOffers(target.getId());
        assertThat(list.get(0).status()).isEqualTo("PENDING");
    }

    // ─────────────────────────────────────────────────────────────────
    // 응답 — 수락/거절/권한/재응답
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("수락 응답 — status=ACCEPTED, storeCode 포함(매장 storeCode 와 일치)")
    void respondToOffer_accept_includesStoreCode() {
        User owner = masterUser("owner_offer12");
        Store store = store(owner);
        User target = employeeUser("target_offer12");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOfferResponse responded = service.respondToOffer(created.id(), target.getId(), true);

        assertThat(responded.status()).isEqualTo("ACCEPTED");
        assertThat(responded.storeCode()).isEqualTo(store.getStoreCode());
    }

    @Test
    @DisplayName("거절 응답 — status=DECLINED, storeCode 미포함")
    void respondToOffer_decline_noStoreCode() {
        User owner = masterUser("owner_offer13");
        Store store = store(owner);
        User target = employeeUser("target_offer13");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOfferResponse responded = service.respondToOffer(created.id(), target.getId(), false);

        assertThat(responded.status()).isEqualTo("DECLINED");
        assertThat(responded.storeCode()).isNull();
    }

    @Test
    @DisplayName("수신자가 아닌 사용자가 응답 → AccessDeniedException(403)")
    void respondToOffer_notRecipient_throwsAccessDenied() {
        User owner = masterUser("owner_offer14");
        Store store = store(owner);
        User target = employeeUser("target_offer14");
        User stranger = employeeUser("stranger_offer14");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));

        assertThatThrownBy(() -> service.respondToOffer(created.id(), stranger.getId(), true))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("이미 응답한 제안에 재응답 → OFFER_NOT_PENDING 409")
    void respondToOffer_alreadyResponded_throwsNotPending() {
        User owner = masterUser("owner_offer15");
        Store store = store(owner);
        User target = employeeUser("target_offer15");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        service.respondToOffer(created.id(), target.getId(), true);

        assertThatThrownBy(() -> service.respondToOffer(created.id(), target.getId(), false))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("OFFER_NOT_PENDING"));
    }

    @Test
    @DisplayName("만료된 제안에 응답 → OFFER_NOT_PENDING 409")
    void respondToOffer_expired_throwsNotPending() {
        User owner = masterUser("owner_offer16");
        Store store = store(owner);
        User target = employeeUser("target_offer16");
        grantEligibility(target, store);
        seekingProfile(target, List.of("REGULAR"));

        JobOfferResponse created = service.sendOffer(store.getId(), regularRequest(target.getId()));
        JobOffer persisted = jobOfferRepo.findById(created.id()).orElseThrow();
        ReflectionTestUtils.setField(persisted, "expiresAt", LocalDateTime.now(SEOUL).minusMinutes(1));
        jobOfferRepo.saveAndFlush(persisted);

        assertThatThrownBy(() -> service.respondToOffer(created.id(), target.getId(), true))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("OFFER_NOT_PENDING"));
    }

}
