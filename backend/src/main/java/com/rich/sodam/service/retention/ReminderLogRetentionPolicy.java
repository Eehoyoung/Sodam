package com.rich.sodam.service.retention;

import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.repository.ReminderLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * reminder_log 1년 보존(DB_OPTIMIZATION_PLAN.md §2.5) — 순수 배치 발송 이력, 개인정보 접속기록에
 * 해당하지 않는 시스템 로그라 「개인정보의 안전성 확보조치 기준」§8 최소 하한(1년) 적용. domain_event와
 * 동일하게 데이터 주체 고지는 생략(noticeRequired=false).
 */
@Component
@RequiredArgsConstructor
public class ReminderLogRetentionPolicy implements RetentionPolicy {

    private final ReminderLogRepository reminderLogRepository;

    @Override
    public String tableName() {
        return "reminder_log";
    }

    @Override
    public Period retentionPeriod() {
        return Period.ofYears(1);
    }

    @Override
    public List<ExpiredEntity> findExpired(LocalDateTime cutoff) {
        return reminderLogRepository.findByCreatedAtLessThan(cutoff).stream()
                .map(r -> new ExpiredEntity(r.getId(), r.getCreatedAt()))
                .toList();
    }

    @Override
    public void purge(Long entityId) {
        reminderLogRepository.deleteById(entityId);
    }
}
