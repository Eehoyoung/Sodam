package com.rich.sodam.service.retention;

import com.rich.sodam.domain.DomainEvent;
import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.domain.RetentionPurgeSchedule;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.domain.type.ReminderType;
import com.rich.sodam.repository.DomainEventRepository;
import com.rich.sodam.repository.ReminderLogRepository;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 6(DB_OPTIMIZATION_PLAN.md §2.2(c), §2.5) — 보존기간 만료 스캔·유예·파기 배치 검증.
 * domain_event(2년)·reminder_log(1년) 두 정책만 연결돼 있으므로 이 둘로 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RetentionPurgeServiceTest {

    @Autowired private RetentionPurgeService retentionPurgeService;
    @Autowired private RetentionPurgeScheduleRepository scheduleRepository;
    @Autowired private DomainEventRepository domainEventRepository;
    @Autowired private ReminderLogRepository reminderLogRepository;

    private DomainEvent expiredEvent;
    private DomainEvent freshEvent;

    @BeforeEach
    void setUp() throws Exception {
        // 2년 보존기간을 넘긴(3년 전) 이벤트 — 만료 대상.
        expiredEvent = DomainEvent.of(DomainEventType.EMPLOYEE_REGISTERED, 1L, 1L, null);
        domainEventRepository.save(expiredEvent);
        backdate(expiredEvent, "occurredAt", LocalDateTime.now().minusYears(3));
        domainEventRepository.save(expiredEvent);

        // 아직 보존기간 이내(1개월 전) 이벤트 — 만료 대상 아님.
        freshEvent = DomainEvent.of(DomainEventType.EMPLOYEE_REGISTERED, 1L, 1L, null);
        domainEventRepository.save(freshEvent);
        backdate(freshEvent, "occurredAt", LocalDateTime.now().minusMonths(1));
        domainEventRepository.save(freshEvent);
    }

    private void backdate(Object entity, String fieldName, LocalDateTime value) throws Exception {
        Field field = entity.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(entity, value);
    }

    @Test
    @DisplayName("보존기간 만료 대상만 파기 스케줄에 등록되고, 아직 안 지난 것은 제외된다")
    void scanAndScheduleOnlyRegistersExpiredEntities() {
        int scheduled = retentionPurgeService.scanAndSchedule();

        assertThat(scheduled).isGreaterThanOrEqualTo(1);
        Optional<RetentionPurgeSchedule> expiredSchedule =
                scheduleRepository.findByTableNameAndEntityId("domain_event", expiredEvent.getId());
        assertThat(expiredSchedule).isPresent();
        assertThat(expiredSchedule.get().getScheduledPurgeAt())
                .isEqualTo(expiredSchedule.get().getRetentionExpiresAt().plusDays(30));

        assertThat(scheduleRepository.findByTableNameAndEntityId("domain_event", freshEvent.getId()))
                .isEmpty();
    }

    @Test
    @DisplayName("두 번 스캔해도 같은 대상은 중복 등록되지 않는다(멱등)")
    void scanAndScheduleIsIdempotent() {
        int first = retentionPurgeService.scanAndSchedule();
        int second = retentionPurgeService.scanAndSchedule();

        assertThat(first).isGreaterThanOrEqualTo(1);
        assertThat(second).isZero();
    }

    @Test
    @DisplayName("유예기간이 지난 대상만 실제 파기되고, 원본 로우가 삭제된다")
    void executePurgeDeletesOnlyDueEntities() throws Exception {
        retentionPurgeService.scanAndSchedule();
        RetentionPurgeSchedule schedule =
                scheduleRepository.findByTableNameAndEntityId("domain_event", expiredEvent.getId()).orElseThrow();
        // 방금 등록된 스케줄은 파기예정일이 미래(만료+30일)라 아직 파기 대상이 아님 — 유예를 다 지난 것처럼 앞당긴다.
        backdate(schedule, "scheduledPurgeAt", LocalDateTime.now().minusDays(1));
        scheduleRepository.save(schedule);

        int purged = retentionPurgeService.executePurge();

        assertThat(purged).isEqualTo(1);
        assertThat(domainEventRepository.findById(expiredEvent.getId())).isEmpty();
        assertThat(scheduleRepository.findByTableNameAndEntityId("domain_event", expiredEvent.getId())
                .orElseThrow().isPurged()).isTrue();
    }

    @Test
    @DisplayName("법적 홀드가 걸린 대상은 파기예정일이 지나도 파기되지 않는다")
    void legalHoldPreventsExecutePurge() throws Exception {
        retentionPurgeService.scanAndSchedule();
        RetentionPurgeSchedule schedule =
                scheduleRepository.findByTableNameAndEntityId("domain_event", expiredEvent.getId()).orElseThrow();
        backdate(schedule, "scheduledPurgeAt", LocalDateTime.now().minusDays(1));
        schedule.placeLegalHold("노동위원회 진정 계류 중");
        scheduleRepository.save(schedule);

        int purged = retentionPurgeService.executePurge();

        assertThat(purged).isZero();
        assertThat(domainEventRepository.findById(expiredEvent.getId())).isPresent();
    }

    @Test
    @DisplayName("reminder_log 1년 보존기간도 동일하게 스캔·파기된다")
    void reminderLogRetentionAlsoWorks() throws Exception {
        ReminderLog log = new ReminderLog(1L, ReminderType.PAYDAY_D3, LocalDate.now());
        reminderLogRepository.save(log);
        backdate(log, "createdAt", LocalDateTime.now().minusYears(2));
        reminderLogRepository.save(log);

        int scheduled = retentionPurgeService.scanAndSchedule();

        assertThat(scheduled).isGreaterThanOrEqualTo(1);
        assertThat(scheduleRepository.findByTableNameAndEntityId("reminder_log", log.getId())).isPresent();
    }
}
