package com.rich.sodam.dto.response;

import com.rich.sodam.domain.StoreNotice;

import java.time.LocalDateTime;

/**
 * 매장 공지 응답 (M-NEW-04/E-NEW-06).
 *
 * <p>사장 화면: {@code readCount}/{@code totalEmployees}(N/M 읽음 집계).
 * 직원 화면: {@code readByMe}(본인 읽음 여부). 화면 성격에 따라 한쪽만 의미가 있다.
 *
 * @param readCount      읽은 직원 수(N). 직원 화면에서는 미사용(0 가능).
 * @param totalEmployees 매장 직원 수(M). 직원 화면에서는 미사용(0 가능).
 * @param readByMe       본인 읽음 여부. 사장 화면에서는 미사용(false 가능).
 */
public record StoreNoticeResponse(
        Long id,
        Long storeId,
        String title,
        String body,
        LocalDateTime createdAt,
        long readCount,
        long totalEmployees,
        boolean readByMe
) {
    /** 사장 화면용 — 읽음 집계(N/M) 포함. */
    public static StoreNoticeResponse forOwner(StoreNotice n, long readCount, long totalEmployees) {
        return new StoreNoticeResponse(
                n.getId(), n.getStoreId(), n.getTitle(), n.getBody(), n.getCreatedAt(),
                readCount, totalEmployees, false);
    }

    /** 직원 화면용 — 본인 읽음 여부 포함. */
    public static StoreNoticeResponse forEmployee(StoreNotice n, boolean readByMe) {
        return new StoreNoticeResponse(
                n.getId(), n.getStoreId(), n.getTitle(), n.getBody(), n.getCreatedAt(),
                0L, 0L, readByMe);
    }
}
