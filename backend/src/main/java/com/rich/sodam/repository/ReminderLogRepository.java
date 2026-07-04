package com.rich.sodam.repository;

import com.rich.sodam.domain.ReminderLog;
import com.rich.sodam.domain.type.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

/**
 * 리마인더 발송 이력 레포지토리 — 배치 멱등성 체크.
 */
public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {

    /** 이미 발송했는지 (store, type, targetDate 단위 멱등성 키 — refId 없는 기존 룰용). */
    boolean existsByStoreIdAndReminderTypeAndTargetDate(Long storeId, ReminderType reminderType, LocalDate targetDate);

    /** 이미 발송했는지 (store, type, targetDate, refId 단위 — SHIFT_LATE 등 대상별 룰용). */
    boolean existsByStoreIdAndReminderTypeAndTargetDateAndRefId(
            Long storeId, ReminderType reminderType, LocalDate targetDate, Long refId);
}
