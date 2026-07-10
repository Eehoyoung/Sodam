package com.rich.sodam.service.retention;

import com.rich.sodam.domain.NotificationInbox;
import com.rich.sodam.repository.NotificationInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/**
 * notification_inbox 1년 보존(DB_OPTIMIZATION_PLAN.md §2.5) — MARKETING/SYSTEM 카테고리.
 * 개인정보보호법 §21 목적달성 시 지체없이 파기 원칙 — 별도 법정 보존 의무가 없는 일반 운영성
 * 알림은 짧게 유지한다(읽음 처리 여부 무관, 발송일 기준).
 */
@Component
@RequiredArgsConstructor
public class NotificationInboxMarketingSystemRetentionPolicy implements RetentionPolicy {

    private static final List<NotificationInbox.Category> CATEGORIES = List.of(
            NotificationInbox.Category.MARKETING,
            NotificationInbox.Category.SYSTEM
    );

    private final NotificationInboxRepository notificationInboxRepository;

    @Override
    public String tableName() {
        return "notification_inbox_marketing_system";
    }

    @Override
    public Period retentionPeriod() {
        return Period.ofYears(1);
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
