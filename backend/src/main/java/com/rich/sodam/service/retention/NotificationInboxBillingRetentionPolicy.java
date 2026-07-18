package com.rich.sodam.service.retention;

import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.repository.NotificationInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * notification_inbox 5년 보존(DB_OPTIMIZATION_PLAN.md §2.5) — BILLING 카테고리.
 * §2.2(a)의 payment_history/subscription과 동일 사유(전자상거래법 시행령 §6①) — 결제 관련 알림은
 * 결제기록의 일부로 취급한다.
 */
@Component
@RequiredArgsConstructor
public class NotificationInboxBillingRetentionPolicy implements RetentionPolicy {

    private static final List<NotificationInbox.Category> CATEGORIES =
            List.of(NotificationInbox.Category.BILLING);

    private final NotificationInboxRepository notificationInboxRepository;

    @Override
    public String tableName() {
        return "notification_inbox_billing";
    }

    @Override
    public Period retentionPeriod() {
        return Period.ofYears(5);
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
