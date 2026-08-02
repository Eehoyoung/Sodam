package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditTransaction;
import com.rich.sodam.domain.ChatRoom;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobApplication;
import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.JobSeekingProfile;
import com.rich.sodam.repository.JobSeekingProfileRepository;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import com.rich.sodam.domain.type.ChatSourceType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.request.JobOfferCreateRequest;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.ChatMessageResponse;
import com.rich.sodam.dto.response.ChatRoomListItemResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.dto.response.JobOfferResponse;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.ChatMessageRepository;
import com.rich.sodam.repository.ChatRoomRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobApplicationRepository;
import com.rich.sodam.repository.JobPostingRepository;
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

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 채팅방/메시지 서비스 테스트(recruitment-monetization-gamification-plan.md §4, Phase D) —
 * 개설 트리거(제안 수락/지원 응답), 참여자 인가, 마스킹 저장, 읽기 전용 lazy 전환.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChatRoomServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired private JobOfferService jobOfferService;
    @Autowired private JobApplicationService jobApplicationService;
    @Autowired private JobPostingService jobPostingService;
    @Autowired private ChatRoomService chatRoomService;

    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private AttendanceCreditRepository attendanceCreditRepo;
    @Autowired private AttendanceCreditTransactionRepository attendanceCreditTransactionRepo;
    @Autowired private JobSeekingProfileRepository jobSeekingProfileRepo;
    @Autowired private JobApplicationRepository jobApplicationRepo;
    @Autowired private JobPostingRepository jobPostingRepo;
    @Autowired private ChatRoomRepository chatRoomRepo;
    @Autowired private ChatMessageRepository chatMessageRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    // ─────────────────────────────────────────────────────────────────
    // 픽스처 헬퍼(JobOfferServiceTest/JobApplicationServiceTest와 동일 패턴)
    // ─────────────────────────────────────────────────────────────────

    private User masterUser() {
        User u = new User("chat_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User employeeUser() {
        User u = new User("chat_emp" + (emailSeq++) + "@x.com", "구직자");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_610_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("채팅테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        s = storeRepo.save(s);
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        grantAttendanceCredits(owner, 1_000);
        return s;
    }

    private void grantAttendanceCredits(User owner, int amount) {
        AttendanceCredit wallet = attendanceCreditRepo.findByOwnerUserId(owner.getId())
                .orElseGet(() -> attendanceCreditRepo.save(AttendanceCredit.openFor(owner.getId())));
        ReflectionTestUtils.setField(wallet, "balance", amount);
        attendanceCreditRepo.save(wallet);

        attendanceCreditTransactionRepo.findAll().stream()
                .filter(t -> t.getOwnerUserId().equals(owner.getId())
                        && t.getType() == AttendanceCreditTransactionType.TOPUP
                        && t.getRemainingQuantity() != null && t.getRemainingQuantity() > 0)
                .forEach(lot -> {
                    lot.drawDown(lot.getRemainingQuantity());
                    attendanceCreditTransactionRepo.save(lot);
                });
        if (amount > 0) {
            attendanceCreditTransactionRepo.save(AttendanceCreditTransaction.supply(owner.getId(),
                    AttendanceCreditTransactionType.TOPUP, AttendanceCreditTransactionReason.IAP_TOPUP,
                    amount, null, LocalDateTime.now(SEOUL)));
        }
    }

    private void grantEligibility(User u, Store store) {
        EmployeeProfile emp = employeeProfileRepo.save(new EmployeeProfile(u));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private void turnOnSeeking(User u, List<String> types) {
        JobSeekingProfile profile = new JobSeekingProfile(u);
        profile.updateSeekingTypes(types);
        profile.turnOn();
        jobSeekingProfileRepo.save(profile);
    }

    private JobOfferResponse sendAndAcceptOffer(User owner, Store store, User target) {
        grantEligibility(target, store);
        turnOnSeeking(target, List.of("REGULAR"));
        JobOfferResponse created = jobOfferService.sendOffer(store.getId(),
                new JobOfferCreateRequest(target.getId(), "REGULAR", null,
                        LocalTime.of(10, 0), LocalTime.of(18, 0), 12_000, "정기로 일해주세요"));
        return jobOfferService.respondToOffer(created.id(), target.getId(), true);
    }

    private JobPosting posting(Store store) {
        jobPostingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", true));
        return jobPostingRepo.findByStore_Id(store.getId()).orElseThrow();
    }

    private JobApplicationResponse applyAndRespond(User owner, Store store, User applicant, boolean accept) {
        grantEligibility(applicant, store);
        JobPosting p = posting(store);
        JobApplicationResponse created = jobApplicationService.apply(p.getId(), applicant.getId(),
                new JobApplicationCreateRequest("잘 부탁드려요"));
        jobApplicationService.respondToApplication(created.id(), owner.getId(), accept);
        return created;
    }

    // ─────────────────────────────────────────────────────────────────
    // 개설 트리거 — 제안 수락 / 지원 응답(수락·거절 모두)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("채용 제안 수락 → 채팅방 개설, 거절 → 채팅방 미개설")
    void offerAccept_opensRoom_decline_doesNot() {
        User owner = masterUser();
        Store store = store(owner);
        User acceptedTarget = employeeUser();
        grantEligibility(acceptedTarget, store);
        turnOnSeeking(acceptedTarget, List.of("REGULAR"));
        JobOfferResponse acceptedOffer = jobOfferService.sendOffer(store.getId(),
                new JobOfferCreateRequest(acceptedTarget.getId(), "REGULAR", null,
                        LocalTime.of(10, 0), LocalTime.of(18, 0), 12_000, "정기로 일해주세요"));
        jobOfferService.respondToOffer(acceptedOffer.id(), acceptedTarget.getId(), true);

        assertThat(chatRoomRepo.existsBySourceTypeAndSourceId(ChatSourceType.OFFER, acceptedOffer.id())).isTrue();

        User declinedTarget = employeeUser();
        grantEligibility(declinedTarget, store);
        turnOnSeeking(declinedTarget, List.of("REGULAR"));
        JobOfferResponse declinedOffer = jobOfferService.sendOffer(store.getId(),
                new JobOfferCreateRequest(declinedTarget.getId(), "REGULAR", null,
                        LocalTime.of(10, 0), LocalTime.of(18, 0), 12_000, "정기로 일해주세요"));
        jobOfferService.respondToOffer(declinedOffer.id(), declinedTarget.getId(), false);

        assertThat(chatRoomRepo.existsBySourceTypeAndSourceId(ChatSourceType.OFFER, declinedOffer.id())).isFalse();
    }

    @Test
    @DisplayName("지원 응답(수락) → 채팅방 개설, 시스템 안내 메시지 포함")
    void applicationAccept_opensRoom_withSystemMessage() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();

        JobApplicationResponse created = applyAndRespond(owner, store, applicant, true);

        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();
        assertThat(room.getMasterUser().getId()).isEqualTo(owner.getId());
        assertThat(room.getCounterpartUser().getId()).isEqualTo(applicant.getId());
        assertThat(chatMessageRepo.findByChatRoom_IdOrderBySentAtAsc(room.getId(),
                org.springframework.data.domain.PageRequest.of(0, 10)).getContent()).hasSize(1);
    }

    @Test
    @DisplayName("지원 응답(거절)도 채팅방을 연다 — §2.3 과금이 수락 여부와 무관한 것과 동일 근거")
    void applicationDecline_alsoOpensRoom() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();

        JobApplicationResponse created = applyAndRespond(owner, store, applicant, false);

        assertThat(chatRoomRepo.existsBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())).isTrue();
    }

    // ─────────────────────────────────────────────────────────────────
    // 참여자 인가
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("참여자가 아닌 사용자는 메시지 전송/조회 시 403")
    void nonParticipant_forbidden() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        JobApplicationResponse created = applyAndRespond(owner, store, applicant, true);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();

        User stranger = employeeUser();

        assertThatThrownBy(() -> chatRoomService.sendMessage(room.getId(), stranger.getId(), "안녕하세요"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> chatRoomService.getMessages(room.getId(), stranger.getId(), 0, 30))
                .isInstanceOf(AccessDeniedException.class);
    }

    // ─────────────────────────────────────────────────────────────────
    // 메시지 전송/조회 — 마스킹 저장
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("전화번호가 포함된 메시지는 마스킹되어 저장된다")
    void sendMessage_masksPhoneNumber() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        JobApplicationResponse created = applyAndRespond(owner, store, applicant, true);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();

        ChatMessageResponse response = chatRoomService.sendMessage(
                room.getId(), applicant.getId(), "제 번호는 010-1234-5678 이에요");

        assertThat(response.masked()).isTrue();
        assertThat(response.content()).doesNotContain("1234-5678");
        assertThat(response.content()).contains("010-****-****");
        assertThat(response.mine()).isTrue();

        List<ChatMessageResponse> forOwner = chatRoomService.getMessages(room.getId(), owner.getId(), 0, 30);
        ChatMessageResponse lastForOwner = forOwner.get(forOwner.size() - 1);
        assertThat(lastForOwner.mine()).isFalse();
        assertThat(lastForOwner.content()).contains("010-****-****");
    }

    @Test
    @DisplayName("내 채팅방 목록 — 참여중인 방을 최신순으로 반환")
    void getMyChatRooms_returnsParticipatingRooms() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        applyAndRespond(owner, store, applicant, true);

        List<ChatRoomListItemResponse> ownerRooms = chatRoomService.getMyChatRooms(owner.getId());
        List<ChatRoomListItemResponse> applicantRooms = chatRoomService.getMyChatRooms(applicant.getId());

        assertThat(ownerRooms).hasSize(1);
        assertThat(ownerRooms.get(0).counterpartUserId()).isEqualTo(applicant.getId());
        assertThat(applicantRooms).hasSize(1);
        assertThat(applicantRooms.get(0).counterpartUserId()).isEqualTo(owner.getId());
    }

    // ─────────────────────────────────────────────────────────────────
    // 읽기 전용 lazy 전환(§4.6)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("지원 거절 채팅방 — 유예기간(7일) 경과 전에는 발신 가능")
    void declinedApplicationRoom_writableWithinGracePeriod() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        JobApplicationResponse created = applyAndRespond(owner, store, applicant, false);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();

        ChatMessageResponse response = chatRoomService.sendMessage(room.getId(), applicant.getId(), "확인했어요");
        assertThat(response).isNotNull();
    }

    @Test
    @DisplayName("지원 거절 채팅방 — 유예기간(7일) 경과 후 발신 시도 시 409, 방은 읽기 전용으로 전환된다")
    void declinedApplicationRoom_readOnlyAfterGracePeriod() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        JobApplicationResponse created = applyAndRespond(owner, store, applicant, false);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();
        ReflectionTestUtils.setField(room, "matchedAt", LocalDateTime.now(SEOUL).minusDays(8));
        chatRoomRepo.save(room);

        assertThatThrownBy(() -> chatRoomService.sendMessage(room.getId(), applicant.getId(), "아직 볼 수 있나요?"))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getErrorCode()).isEqualTo("CHAT_ROOM_READ_ONLY"));

        ChatRoom reloaded = chatRoomRepo.findById(room.getId()).orElseThrow();
        assertThat(reloaded.isReadOnly()).isTrue();

        // 기존 대화는 계속 조회 가능해야 한다(§4.6 "지난 대화는 그대로 열람 가능").
        assertThat(chatRoomService.getMessages(room.getId(), owner.getId(), 0, 30)).isNotEmpty();
    }

    @Test
    @DisplayName("제안 수락(OFFER) 채팅방은 유예기간 정책 대상이 아니다 — 영구 활성")
    void acceptedOfferRoom_neverReadOnly() {
        User owner = masterUser();
        Store store = store(owner);
        User target = employeeUser();
        JobOfferResponse accepted = sendAndAcceptOffer(owner, store, target);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.OFFER, accepted.id())
                .orElseThrow();
        ReflectionTestUtils.setField(room, "matchedAt", LocalDateTime.now(SEOUL).minusDays(365));
        chatRoomRepo.save(room);

        ChatMessageResponse response = chatRoomService.sendMessage(room.getId(), target.getId(), "감사합니다");
        assertThat(response).isNotNull();
    }
}
