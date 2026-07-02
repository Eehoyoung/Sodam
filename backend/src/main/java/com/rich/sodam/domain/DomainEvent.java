package com.rich.sodam.domain;

import com.rich.sodam.domain.type.DomainEventType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 퍼널 계측 이벤트 (A6) — append-only 분석 로그.
 *
 * <p>한 번 적재되면 수정/삭제하지 않는다(불변 이력). PII 미저장 — userId/storeId 참조키와
 * 소량 metadata(숫자·코드 수준)만. 분석 외 비즈니스 로직에 쓰지 않는다.
 */
@Entity
@Table(name = "domain_event", indexes = {
        @Index(name = "idx_domain_event_store_time", columnList = "store_id, occurred_at"),
        @Index(name = "idx_domain_event_type_time", columnList = "event_type, occurred_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DomainEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "domain_event_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 40, nullable = false)
    private DomainEventType eventType;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "store_id")
    private Long storeId;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    /** 소량 부가정보(예: "weeklyHours=15"). PII·민감정보 금지. */
    @Column(name = "metadata", length = 500)
    private String metadata;

    private DomainEvent(DomainEventType eventType, Long userId, Long storeId, String metadata) {
        this.eventType = eventType;
        this.userId = userId;
        this.storeId = storeId;
        this.metadata = metadata;
        this.occurredAt = LocalDateTime.now();
    }

    public static DomainEvent of(DomainEventType eventType, Long userId, Long storeId, String metadata) {
        return new DomainEvent(eventType, userId, storeId, metadata);
    }
}
