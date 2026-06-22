package com.rich.sodam.dto.response;

import com.rich.sodam.domain.StoreNfcTag;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 매장 NFC 태그 응답. 사장 관리 화면용.
 */
@Getter
@Builder
public class StoreNfcTagResponse {

    private final Long id;
    private final Long storeId;
    private final String tagId;
    private final String label;
    private final boolean active;
    private final LocalDateTime createdAt;

    public static StoreNfcTagResponse from(StoreNfcTag tag) {
        return StoreNfcTagResponse.builder()
                .id(tag.getId())
                .storeId(tag.getStore() != null ? tag.getStore().getId() : null)
                .tagId(tag.getTagId())
                .label(tag.getLabel())
                .active(tag.isActive())
                .createdAt(tag.getCreatedAt())
                .build();
    }
}
