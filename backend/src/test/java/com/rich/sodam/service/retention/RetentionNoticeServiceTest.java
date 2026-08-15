package com.rich.sodam.service.retention;

import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.RetentionPurgeSchedule;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * WP-J — 파기 전 사전 고지(30/15/1일) 검증.
 *
 * <p>가장 중요한 두 가지: <b>한 사람의 여러 로우가 메일 1통으로 묶이는가</b>(출퇴근은 1인당 수백 건이라
 * 로우당 1통이면 사고), 그리고 <b>고지가 완결되지 않은 건은 파기되지 않는가</b>(임금채권 시효가
 * 보존기간과 같은 3년이라 통지 없이 증거가 사라지면 안 된다).</p>
 *
 * <p>{@code sendDueNotices()}가 {@code retention_purge_schedule} 테이블을 storeId 등으로 스코프
 * 없이 전체 스캔한다(경보 성격상 매장 무관 전역 배치라 원래 그렇다). 그래서 같은 컨텍스트를 공유하는
 * 다른 테스트 클래스가(트랜잭션 롤백 없이) 남긴 잔여 스케줄 로우가 있으면 이 클래스의 "정확히 1통"
 * 어서션이 오염된다 — 260815 세션에서 전체 스위트 실행 시에만(단독/패키지 실행은 항상 성공) 실제로
 * 재현 확인. {@code TransactionBoundaryTest}·{@code StoreManagerConcurrencyTest} 등 기존 5개
 * 클래스와 동일한 처방으로 이 클래스 전용 H2 컨텍스트를 격리한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class RetentionNoticeServiceTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private RetentionPurgeService retentionPurgeService;
    @Autowired private RetentionPurgeScheduleRepository scheduleRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private List<RetentionPolicy> policies;

    private EmailSender emailSender;
    private RetentionNoticeService noticeService;

    @BeforeEach
    void setUp() {
        emailSender = mock(EmailSender.class);
        when(emailSender.sendWithAttachments(anyString(), anyString(), anyString(), any()))
                .thenReturn(EmailSender.SendResult.ok());
        noticeService = new RetentionNoticeService(policies, scheduleRepository, userRepository, emailSender);
    }

    /** 퇴사 4년 경과 직원 1명 + 출퇴근 {@code attendanceCount}건을 만들고 파기 스케줄까지 등록한다. */
    private User createTerminatedEmployeeWithAttendances(int attendanceCount) throws Exception {
        int n = SEQ.incrementAndGet();

        User employeeUser = new User("retention_notice" + n + "@example.com", "고지대상" + n);
        employeeUser.setUserGrade(UserGrade.EMPLOYEE);
        employeeUser = userRepository.saveAndFlush(employeeUser);

        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(employeeUser));
        Store store = storeRepository.save(
                new Store("고지매장" + n, String.format("%010d", 7_000_000_000L + n), "02-000-0000", "카페", 12_000, 100));

        EmployeeStoreRelation relation = relationRepository.save(new EmployeeStoreRelation(profile, store, 12_000));
        relation.changeActive(false);
        setField(relation, "deactivatedAt", LocalDateTime.now().minusYears(4));
        relationRepository.saveAndFlush(relation);

        for (int i = 0; i < attendanceCount; i++) {
            Attendance attendance = new Attendance(profile, store);
            attendance.checkIn(37.0, 127.0, 12_000);
            attendanceRepository.saveAndFlush(attendance);
        }

        retentionPurgeService.scanAndSchedule();
        return employeeUser;
    }

    private void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }

    @Test
    @DisplayName("한 사람의 출퇴근 기록 여러 건은 메일 1통으로 묶여 발송된다")
    void multipleRowsForOnePersonAreBatchedIntoSingleEmail() throws Exception {
        User employee = createTerminatedEmployeeWithAttendances(5);

        int sent = noticeService.sendDueNotices();

        assertThat(sent).isEqualTo(1);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(emailSender, times(1))
                .sendWithAttachments(eq(employee.getEmail()), anyString(), body.capture(), any());
        assertThat(body.getValue()).contains("출퇴근 기록 5건");
        assertThat(body.getValue()).contains("되돌릴 수 없");
    }

    @Test
    @DisplayName("이미 보낸 고지 단계는 다시 보내지 않는다")
    void alreadySentMilestoneIsNotResent() throws Exception {
        createTerminatedEmployeeWithAttendances(2);

        assertThat(noticeService.sendDueNotices()).isEqualTo(1);
        assertThat(noticeService.sendDueNotices()).isZero();
    }

    @Test
    @DisplayName("발송에 실패하면 발송 시각을 기록하지 않아 다음 배치가 재시도한다")
    void failedSendIsRetriedNextRun() throws Exception {
        createTerminatedEmployeeWithAttendances(1);
        when(emailSender.sendWithAttachments(anyString(), anyString(), anyString(), any()))
                .thenReturn(EmailSender.SendResult.fail("smtp down"));

        assertThat(noticeService.sendDueNotices()).isZero();

        when(emailSender.sendWithAttachments(anyString(), anyString(), anyString(), any()))
                .thenReturn(EmailSender.SendResult.ok());
        assertThat(noticeService.sendDueNotices()).isEqualTo(1);
    }

    @Test
    @DisplayName("사전 고지가 완결되지 않은 건은 파기 예정일이 지나도 파기되지 않는다")
    void purgeIsBlockedUntilAllNoticesSent() throws Exception {
        createTerminatedEmployeeWithAttendances(1);
        RetentionPurgeSchedule schedule = scheduleRepository.findAll().stream()
                .filter(s -> s.getTableName().equals("attendance"))
                .findFirst().orElseThrow();
        // 파기 예정일을 과거로 당겨 파기 대상으로 만든다 — 고지는 30일분만 보낸 상태.
        noticeService.sendDueNotices();
        setField(schedule, "scheduledPurgeAt", LocalDateTime.now().minusDays(1));
        scheduleRepository.saveAndFlush(schedule);

        assertThat(schedule.isNoticeCompleted()).isFalse();
        assertThat(retentionPurgeService.executePurge()).isZero();
        assertThat(attendanceRepository.findById(schedule.getEntityId())).isPresent();
    }

    @Test
    @DisplayName("30/15/1일 고지가 모두 완료되면 파기가 진행된다")
    void purgeProceedsAfterAllNoticesSent() throws Exception {
        createTerminatedEmployeeWithAttendances(1);
        RetentionPurgeSchedule schedule = scheduleRepository.findAll().stream()
                .filter(s -> s.getTableName().equals("attendance"))
                .findFirst().orElseThrow();

        LocalDateTime now = LocalDateTime.now();
        schedule.markNoticeSent(30, now);
        schedule.markNoticeSent(15, now);
        schedule.markNoticeSent(1, now);
        setField(schedule, "scheduledPurgeAt", now.minusDays(1));
        scheduleRepository.saveAndFlush(schedule);

        assertThat(retentionPurgeService.executePurge()).isEqualTo(1);
        assertThat(attendanceRepository.findById(schedule.getEntityId())).isEmpty();
    }

    @Test
    @DisplayName("법적 홀드가 걸린 건은 고지도 파기도 하지 않는다")
    void legalHoldSuppressesNoticeAndPurge() throws Exception {
        createTerminatedEmployeeWithAttendances(1);
        RetentionPurgeSchedule schedule = scheduleRepository.findAll().stream()
                .filter(s -> s.getTableName().equals("attendance"))
                .findFirst().orElseThrow();
        schedule.placeLegalHold("노동위 구제신청 계류");
        setField(schedule, "scheduledPurgeAt", LocalDateTime.now().minusDays(1));
        scheduleRepository.saveAndFlush(schedule);

        assertThat(noticeService.sendDueNotices()).isZero();
        assertThat(retentionPurgeService.executePurge()).isZero();
        assertThat(attendanceRepository.findById(schedule.getEntityId())).isPresent();
    }
}
