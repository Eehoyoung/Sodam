package com.rich.sodam.service.retention;

import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.repository.NotificationInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * notification_inbox 3년 보존(DB_OPTIMIZATION_PLAN.md §2.5) — ATTENDANCE/PAYROLL/NOTICE 카테고리.
 * 근로계약·급여·근태 변경을 직원에게 통지했다는 증빙 성격이라, 근로기준법 시행령 §22 근로관계
 * 서류에 준해 취급한다(분쟁 시 "통지했는지 여부"의 증거자료).
 *
 * <p>고지(이메일) 없이 파기한다(noticeRequired 기본값 false 유지) — 알림은 발송 시점에 이미
 * 사용자가 확인했을 (또는 확인 기회가 있었을) 기록이라, domain_event/reminder_log와 마찬가지로
 * "몇 년 전 알림 이력이 곧 지워진다"를 재통지할 실익이 낮다고 판단했다.
 */
@Component
@RequiredArgsConstructor
public class NotificationInboxHrNoticeRetentionPolicy implements RetentionPolicy {

    private static final List<NotificationInbox.Category> CATEGORIES = List.of(
            NotificationInbox.Category.ATTENDANCE,
            NotificationInbox.Category.PAYROLL,
            NotificationInbox.Category.NOTICE
    );

    private final NotificationInboxRepository notificationInboxRepository;

    @Override
    public String tableName() {
        return "notification_inbox_hr_notice";
    }

    @Override
    public Period retentionPeriod() {
        return Period.ofYears(3);
    }

    @Override
    public List<ExpiredEntity> findExpired(LocalDateTime cutoff) {
        return notificationInboxRepository.findByCategoryInAndCreatedAtLessThan(CATEGORIES, cutoff).stream()
                .map(n -> new ExpiredEntity(n.getId(), n.getCreatedAt()))
                .toList();
    }

    @Override
    public void purge(Long entityId) {
        notificationInboxRepository.deleteById(entityId);
    }
}
