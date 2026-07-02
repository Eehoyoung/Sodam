package com.rich.sodam.service;

import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.dto.response.WeeklyInsightsResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 퍼널 계측 (A6) — 이벤트 적재·주간 집계 검증.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DomainEventServiceTest {

    @Autowired private DomainEventService service;

    @Test
    @DisplayName("적재 후 주간 인사이트 종류별 카운트 + 미발생 종류는 0")
    void recordAndAggregate() {
        long storeId = 7_777L;
        service.record(DomainEventType.STORE_CREATED, 1L, storeId, null);
        service.record(DomainEventType.PURCHASE_SAVED, null, storeId, "category=VEGETABLE");
        service.record(DomainEventType.PURCHASE_SAVED, null, storeId, "category=LIQUOR");
        service.record(DomainEventType.PAYROLL_PREVIEW_VIEWED, 1L, storeId, "weeklyHours=15");

        WeeklyInsightsResponse res = service.weeklyInsights(storeId, 7);

        Map<String, Long> counts = res.items().stream()
                .collect(Collectors.toMap(WeeklyInsightsResponse.InsightItem::eventType,
                        WeeklyInsightsResponse.InsightItem::count));

        assertThat(counts.get("STORE_CREATED")).isEqualTo(1);
        assertThat(counts.get("PURCHASE_SAVED")).isEqualTo(2);
        assertThat(counts.get("PAYROLL_PREVIEW_VIEWED")).isEqualTo(1);
        assertThat(counts.get("SUBSCRIPTION_STARTED")).isZero(); // 미발생 종류도 0으로 노출
        assertThat(res.items()).hasSize(DomainEventType.values().length);
    }

    @Test
    @DisplayName("다른 매장 이벤트는 섞이지 않음")
    void storeScoped() {
        service.record(DomainEventType.STORE_CREATED, 1L, 8_001L, null);
        service.record(DomainEventType.STORE_CREATED, 2L, 8_002L, null);

        WeeklyInsightsResponse res = service.weeklyInsights(8_001L, 7);
        long created = res.items().stream()
                .filter(i -> i.eventType().equals("STORE_CREATED"))
                .findFirst().orElseThrow().count();
        assertThat(created).isEqualTo(1);
    }
}
