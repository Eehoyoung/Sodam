package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 매장-NFC 태그 매핑. 대리출근 방지의 물리적 현장 인증 근거.
 *
 * <p>출근 시 제시된 (storeId, tagId) 가 active 로 이 테이블에 등록돼 있어야만 통과한다.
 * 임의 문자열 통과(스텁)를 막고, 실제로 매장에 부착된 태그만 인정한다.
 *
 * <p>PII 미저장 — 태그 식별자(tagId)와 사장이 붙인 라벨만 보관한다.
 */
@Entity
@Table(name = "store_nfc_tag", indexes = {
        @Index(name = "idx_store_nfc_tag_store", columnList = "store_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_store_nfc_tag_tag_id", columnNames = "tag_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoreNfcTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_nfc_tag_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** 물리 태그 식별자(NDEF/UID 등). 전역 유니크 — 한 태그는 한 매장에만 귀속. */
    @Column(name = "tag_id", nullable = false, length = 128)
    private String tagId;

    /** 사장이 붙이는 식별용 라벨 (예: "정문 입구"). */
    @Column(name = "label", length = 100)
    private String label;

    /** 활성 여부. 비활성(false) 태그는 출근 검증을 통과시키지 않는다. */
    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private StoreNfcTag(Store store, String tagId, String label) {
        this.store = store;
        this.tagId = tagId;
        this.label = label;
        this.active = true;
        this.createdAt = LocalDateTime.now();
    }

    public static StoreNfcTag register(Store store, String tagId, String label) {
        return new StoreNfcTag(store, tagId, label);
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    /** 라벨 갱신(식별용 메모, PII 아님). */
    public void updateLabel(String label) {
        this.label = label;
    }
}
