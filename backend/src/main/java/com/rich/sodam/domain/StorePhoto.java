package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 매장 사진 메타데이터 (실제 이미지 바이너리는 S3/로컬 디스크 — ObjectStorage 추상화).
 *
 * 1 매장당 최대 5장 (정책은 service 측 검증).
 */
@Entity
@Table(name = "store_photo", indexes = {
        @Index(name = "idx_store_photo_store", columnList = "store_id, displayOrder")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StorePhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_photo_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** ObjectStorage key (예: "stores/{storeId}/photos/{uuid}.jpg") */
    @Column(nullable = false, length = 300)
    private String storageKey;

    /** 공개 URL (서명된 URL 또는 정적) — mock 시 placeholder */
    @Column(nullable = false, length = 500)
    private String publicUrl;

    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(length = 100)
    private String contentType;

    private Long sizeBytes;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    public static StorePhoto of(Store store, String storageKey, String publicUrl,
                                int order, String contentType, long sizeBytes) {
        StorePhoto p = new StorePhoto();
        p.store = store;
        p.storageKey = storageKey;
        p.publicUrl = publicUrl;
        p.displayOrder = order;
        p.contentType = contentType;
        p.sizeBytes = sizeBytes;
        p.uploadedAt = LocalDateTime.now();
        return p;
    }
}
