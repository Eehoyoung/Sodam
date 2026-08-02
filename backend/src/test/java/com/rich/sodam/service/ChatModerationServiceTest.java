package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditTransaction;
import com.rich.sodam.domain.ChatMessage;
import com.rich.sodam.domain.ChatRoom;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import com.rich.sodam.domain.type.ChatSourceType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.ChatMessageResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.dto.response.JobSeekerListItemResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ChatSenderRestrictedException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.ChatMessageRepository;
import com.rich.sodam.repository.ChatRoomRepository;
import com.rich.sodam.repository.ChatUserRestrictionRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserBlockRepository;
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
 * 채팅 최소 안전장치 테스트(recruitment-monetization-gamification-plan.md §4.4, Phase D) —
 * 신고 누적 임계치, 차단 후 상호 비노출.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChatModerationServiceTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired private JobApplicationService jobApplicationService;
    @Autowired private JobPostingService jobPostingService;
    @Autowired private ChatRoomService chatRoomService;
    @Autowired private ChatModerationService chatModerationService;
    @Autowired private JobSeekingService jobSeekingService;

    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private AttendanceCreditRepository attendanceCreditRepo;
    @Autowired private AttendanceCreditTransactionRepository attendanceCreditTransactionRepo;
    @Autowired private JobPostingRepository jobPostingRepo;
    @Autowired private ChatRoomRepository chatRoomRepo;
    @Autowired private ChatMessageRepository chatMessageRepo;
    @Autowired private ChatUserRestrictionRepository chatUserRestrictionRepo;
    @Autowired private UserBlockRepository userBlockRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("mod_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User employeeUser() {
        User u = new User("mod_emp" + (emailSeq++) + "@x.com", "구직자");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_710_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("신고차단테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
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

    /** EmployeeProfile은 User와 PK를 공유하므로(@MapsId), 같은 사용자에 대해 두 번째로 호출해도 안전하게 재사용한다. */
    private void grantEligibility(User u, Store store) {
        EmployeeProfile emp = employeeProfileRepo.findById(u.getId())
                .orElseGet(() -> employeeProfileRepo.save(new EmployeeProfile(u)));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private JobPosting posting(Store store) {
        jobPostingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", true));
        return jobPostingRepo.findByStore_Id(store.getId()).orElseThrow();
    }

    /** 사장-지원자 채팅방을 개설하고, 지원자가 보낸 메시지 1건의 id를 반환한다. */
    private long openRoomWithOneApplicantMessage(User owner, Store store, User applicant) {
        grantEligibility(applicant, store);
        JobPosting p = posting(store);
        JobApplicationResponse created = jobApplicationService.apply(p.getId(), applicant.getId(),
                new JobApplicationCreateRequest("잘 부탁드려요"));
        jobApplicationService.respondToApplication(created.id(), owner.getId(), true);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();
        ChatMessageResponse message = chatRoomService.sendMessage(room.getId(), applicant.getId(), "안녕하세요");
        return message.id();
    }

    // ─────────────────────────────────────────────────────────────────
    // 신고 — 자기 메시지 신고 불가 / 중복 신고 방지 / 누적 임계치
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("본인이 보낸 메시지는 신고할 수 없다")
    void reportMessage_selfMessage_throws() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        long messageId = openRoomWithOneApplicantMessage(owner, store, applicant);

        assertThatThrownBy(() -> chatModerationService.reportMessage(messageId, applicant.getId(), "SPAM"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("같은 신고자가 같은 메시지를 중복 신고하면 409")
    void reportMessage_duplicateByReporter_throws() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        long messageId = openRoomWithOneApplicantMessage(owner, store, applicant);

        chatModerationService.reportMessage(messageId, owner.getId(), "SPAM");

        assertThatThrownBy(() -> chatModerationService.reportMessage(messageId, owner.getId(), "SPAM"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("서로 다른 신고자 3명이 신고하면 발신자의 채팅 발신이 자동 제한된다")
    void reportMessage_thresholdReached_restrictsSender() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        long messageId = openRoomWithOneApplicantMessage(owner, store, applicant);
        ChatRoom room = chatRoomRepo.findAll().stream()
                .filter(r -> r.getCounterpartUser().getId().equals(applicant.getId())).findFirst().orElseThrow();

        User reporter1 = owner; // 채팅방 참여자만 신고 가능하므로 사장을 첫 신고자로 사용
        User reporter2 = employeeUser();
        User reporter3 = employeeUser();

        chatModerationService.reportMessage(messageId, reporter1.getId(), "SPAM");
        assertThat(chatUserRestrictionRepo.existsById(applicant.getId())).isFalse();

        // 신고자2/3은 해당 채팅방 참여자가 아니므로, 새 채팅방을 열어 같은 발신자(applicant)의 다른 메시지를 신고한다.
        long secondRoomMessageId = openSecondRoomAndSendMessage(applicant, reporter2);
        chatModerationService.reportMessage(secondRoomMessageId, reporter2.getId(), "INAPPROPRIATE_LANGUAGE");
        assertThat(chatUserRestrictionRepo.existsById(applicant.getId())).isFalse();

        long thirdRoomMessageId = openSecondRoomAndSendMessage(applicant, reporter3);
        chatModerationService.reportMessage(thirdRoomMessageId, reporter3.getId(), "FRAUD_SUSPECTED");
        assertThat(chatUserRestrictionRepo.existsById(applicant.getId())).isTrue();

        assertThatThrownBy(() -> chatRoomService.sendMessage(room.getId(), applicant.getId(), "저 아직 여기 있어요"))
                .isInstanceOf(ChatSenderRestrictedException.class);
    }

    /** applicant가 새로운 사장(reporterAsOwner)의 매장에 지원해 채팅방을 열고, 메시지 1건을 보낸다. */
    private long openSecondRoomAndSendMessage(User applicant, User reporterAsOwner) {
        Store otherStore = store(reporterAsOwner);
        grantEligibility(applicant, otherStore);
        JobPosting p = posting(otherStore);
        JobApplicationResponse created = jobApplicationService.apply(p.getId(), applicant.getId(), null);
        jobApplicationService.respondToApplication(created.id(), reporterAsOwner.getId(), true);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();
        ChatMessageResponse message = chatRoomService.sendMessage(room.getId(), applicant.getId(), "안녕하세요");
        return message.id();
    }

    // ─────────────────────────────────────────────────────────────────
    // 차단 — 리스트/채팅 상호 비노출
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("자기 자신은 차단할 수 없다")
    void block_self_throws() {
        User owner = masterUser();

        assertThatThrownBy(() -> chatModerationService.block(owner.getId(), owner.getId()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("차단하면 상대의 채팅방이 내 목록에서 사라지고, 서로 접근이 막힌다")
    void block_hidesRoomAndBlocksAccess() {
        User owner = masterUser();
        Store store = store(owner);
        User applicant = employeeUser();
        grantEligibility(applicant, store);
        JobPosting p = posting(store);
        JobApplicationResponse created = jobApplicationService.apply(p.getId(), applicant.getId(), null);
        jobApplicationService.respondToApplication(created.id(), owner.getId(), true);
        ChatRoom room = chatRoomRepo.findBySourceTypeAndSourceId(ChatSourceType.APPLICATION, created.id())
                .orElseThrow();

        assertThat(chatRoomService.getMyChatRooms(owner.getId())).hasSize(1);

        chatModerationService.block(owner.getId(), applicant.getId());

        assertThat(chatRoomService.getMyChatRooms(owner.getId())).isEmpty();
        assertThatThrownBy(() -> chatRoomService.sendMessage(room.getId(), applicant.getId(), "안녕하세요"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> chatRoomService.sendMessage(room.getId(), owner.getId(), "안녕하세요"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("차단하면 4km 매칭 리스트에서도 상호 비노출된다")
    void block_hidesFromJobSeekerList() {
        User owner = masterUser();
        Store store = store(owner);
        User seeker = employeeUser();
        grantEligibility(seeker, store);
        com.rich.sodam.domain.JobSeekingProfile profile = new com.rich.sodam.domain.JobSeekingProfile(seeker);
        profile.updateSeekingTypes(List.of("REGULAR"));
        profile.updateJobCategories(List.of("CAFE"));
        profile.updateLocations("서울 중구", 37.5665, 126.9780, "서울 종로구", 37.5729, 126.9794);
        profile.updateAvailability(List.of(new com.rich.sodam.domain.JobAvailabilityDay(
                java.time.DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(18, 0))));
        profile.turnOn();
        jobSeekingProfileRepoSave(profile);

        List<JobSeekerListItemResponse> before = jobSeekingService.getJobSeekersForStore(store.getId(), null, null);
        assertThat(before).extracting(JobSeekerListItemResponse::userId).contains(seeker.getId());

        chatModerationService.block(owner.getId(), seeker.getId());

        List<JobSeekerListItemResponse> after = jobSeekingService.getJobSeekersForStore(store.getId(), null, null);
        assertThat(after).extracting(JobSeekerListItemResponse::userId).doesNotContain(seeker.getId());
    }

    @Autowired
    private com.rich.sodam.repository.JobSeekingProfileRepository jobSeekingProfileRepository;

    private void jobSeekingProfileRepoSave(com.rich.sodam.domain.JobSeekingProfile profile) {
        jobSeekingProfileRepository.save(profile);
    }
}
