package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BusinessEntityType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사업자 단위 엔티티(DB_OPTIMIZATION_PLAN.md §2.13, Phase 7 A단계 — 스키마만 도입).
 *
 * <p>{@code store} 위에 두는 대리키(surrogate key) 모델이다 — 자연키(사업자등록번호)를 FK로 전파하지
 * 않는다는 §2.10의 결론을 그대로 따른다. A단계에서는 기존 매장 전량이 "매장 1개 = 사업자 1개"로 자동
 * 백필되며, {@code store.businessEntityId}로 연결된다(현재는 API/화면에서 이 연결을 사용하지 않는다 —
 * B단계 매장 그룹핑 UI 착수 시 비로소 활용).</p>
 *
 * <p>{@code businessNumberSearchHash}는 §2.6 블라인드 인덱스를 재사용한다 — 사업자등록번호 원문은 이미
 * {@code store.businessNumber}에 암호화 저장되어 있으므로 여기서는 중복 사업자 감지용 해시만 보관하고
 * 원문을 다시 저장하지 않는다(PII 중복 저장 방지).</p>
 */
@Entity
@Table(name = "business_entity", indexes = {
        @Index(name = "idx_business_entity_representative_user", columnList = "representative_user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BusinessEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** 대표 계정(FK user). A단계 백필에서는 해당 매장의 최초 소유 사장 계정을 그대로 사용한다. */
    @Column(name = "representative_user_id")
    private Long representativeUserId;

    /** §2.6 블라인드 인덱스 재사용 — 중복 사업자 감지용. 원문 사업자등록번호는 저장하지 않는다. */
    @Column(name = "business_number_search_hash", unique = true, length = 64)
    private String businessNumberSearchHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 30)
    private BusinessEntityType entityType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public BusinessEntity(String name, Long representativeUserId, String businessNumberSearchHash,
                           BusinessEntityType entityType) {
        this.name = name;
        this.representativeUserId = representativeUserId;
        this.businessNumberSearchHash = businessNumberSearchHash;
        this.entityType = entityType;
        this.createdAt = LocalDateTime.now();
    }
}
