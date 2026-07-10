package com.rich.sodam.service.retention;

import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.NotificationInboxRepository;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 4(DB_OPTIMIZATION_PLAN.md §2.5) — notification_inbox 카테고리별 보존기간 검증.
 * 같은 물리 테이블을 대상으로 하는 정책 3개(HR/고지=3년, BILLING=5년, MARKETING/SYSTEM=1년)가
 * 서로의 카테고리를 침범하지 않고, 각자의 보존기간 기준으로만 만료 판정하는지 확인한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NotificationInboxRetentionPolicyTest {

    @Autowired private RetentionPurgeService retentionPurgeService;
    @Autowired private RetentionPurgeScheduleRepository scheduleRepository;
    @Autowired private NotificationInboxRepository notificationInboxRepository;
    @Autowired private UserRepository userRepository;

    private User user;

    @BeforeEach
    void setUp() {
        User u = new User("retention_notif@example.com", "보존테스트");
        u.setUserGrade(UserGrade.EMPLOYEE);
        user = userRepository.save(u);
    }

    private NotificationInbox save(NotificationInbox.Category category, LocalDateTime createdAt) throws Exception {
        NotificationInbox n = NotificationInbox.of(user, category, "제목", "본문", null);
        notificationInboxRepository.save(n);
        Field field = NotificationInbox.class.getDeclaredField("createdAt");
        field.setAccessible(true);
        field.set(n, createdAt);
        notificationInboxRepository.save(n);
        return n;
    }

    @Test
    @DisplayName("ATTENDANCE/PAYROLL/NOTICE는 3년 지나야 만료되고, 2년차는 아직 대상 아니다")
    void hrNoticeCategoryUsesThreeYearRetention() throws Exception {
        NotificationInbox expired = save(NotificationInbox.Category.ATTENDANCE, LocalDateTime.now().minusYears(4));
        NotificationInbox fresh = save(NotificationInbox.Category.PAYROLL, LocalDateTime.now().minusYears(2));

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduleRepository.findByTableNameAndEntityId("notification_inbox_hr_notice", expired.getId()))
                .isPresent();
        assertThat(scheduleRepository.findByTableNameAndEntityId("notification_inbox_hr_notice", fresh.getId()))
                .isEmpty();
    }

    @Test
    @DisplayName("BILLING은 5년, MARKETING/SYSTEM은 1년 — 같은 만료 시점이라도 카테고리별로 다르게 판정된다")
    void billingAndMarketingUseDifferentRetentionPeriods() throws Exception {
        LocalDateTime threeYearsAgo = LocalDateTime.now().minusYears(3);
        NotificationInbox billing = save(NotificationInbox.Category.BILLING, threeYearsAgo); // 5년 미만 → 미만료
        NotificationInbox marketing = save(NotificationInbox.Category.MARKETING, threeYearsAgo); // 1년 초과 → 만료

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduleRepository.findByTableNameAndEntityId("notification_inbox_billing", billing.getId()))
                .isEmpty();
        assertThat(scheduleRepository.findByTableNameAndEntityId(
                "notification_inbox_marketing_system", marketing.getId()))
                .isPresent();
    }

    @Test
    @DisplayName("파기 실행 시 실제 notification_inbox 로우가 삭제된다")
    void executePurgeDeletesUnderlyingRow() throws Exception {
        NotificationInbox expired = save(NotificationInbox.Category.SYSTEM, LocalDateTime.now().minusYears(2));
        retentionPurgeService.scanAndSchedule();
        var schedule = scheduleRepository
                .findByTableNameAndEntityId("notification_inbox_marketing_system", expired.getId())
                .orElseThrow();
        Field field = schedule.getClass().getDeclaredField("scheduledPurgeAt");
        field.setAccessible(true);
        field.set(schedule, LocalDateTime.now().minusDays(1));
        scheduleRepository.save(schedule);

        int purged = retentionPurgeService.executePurge();

        assertThat(purged).isEqualTo(1);
        assertThat(notificationInboxRepository.findById(expired.getId())).isEmpty();
    }
}
