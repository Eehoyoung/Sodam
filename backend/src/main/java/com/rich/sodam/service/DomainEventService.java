package com.rich.sodam.service;

import com.rich.sodam.domain.DomainEvent;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.dto.response.WeeklyInsightsResponse;
import com.rich.sodam.repository.DomainEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 퍼널 계측 이벤트 적재·집계 (A6).
 *
 * <p>{@link #record}: append-only 적재. <b>분석은 비즈니스 흐름을 절대 막지 않는다</b> —
 * 적재 실패 시 예외를 삼키고 로그만 남긴다(호스트 트랜잭션 보호).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DomainEventService {

    private final DomainEventRepository repository;

    /** 이벤트 적재. 실패해도 호출부(비즈니스 로직)에 영향 주지 않는다. */
    @Transactional
    public void record(DomainEventType type, Long userId, Long storeId, String metadata) {
        try {
            repository.save(DomainEvent.of(type, userId, storeId, metadata));
        } catch (Exception e) {
            log.warn("도메인 이벤트 적재 실패(무시) type={} store={} : {}", type, storeId, e.getMessage());
        }
    }

    /** 한 매장의 최근 days 일 이벤트 종류별 카운트. */
    @Transactional(readOnly = true)
    public WeeklyInsightsResponse weeklyInsights(Long storeId, int days) {
        LocalDate fromDate = LocalDate.now().minusDays(days);
        LocalDateTime since = fromDate.atStartOfDay();
        List<DomainEvent> events = repository.findByStoreIdAndOccurredAtGreaterThanEqual(storeId, since);

        Map<DomainEventType, Long> counts = new EnumMap<>(DomainEventType.class);
        for (DomainEvent e : events) {
            counts.merge(e.getEventType(), 1L, Long::sum);
        }

        // 모든 종류를 0 포함해 안정적 순서로 노출
        List<WeeklyInsightsResponse.InsightItem> items = java.util.Arrays.stream(DomainEventType.values())
                .map(t -> new WeeklyInsightsResponse.InsightItem(
                        t.name(), t.getLabel(), counts.getOrDefault(t, 0L)))
                .toList();

        return new WeeklyInsightsResponse(storeId, fromDate, days, items);
    }
}
