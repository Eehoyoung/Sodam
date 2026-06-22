package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 매장 공지 (M-NEW-04/E-NEW-06). 사장이 올리는 단방향 공지.
 *
 * <p>스코프: 단방향 공지 + 읽음확인만. 채팅(양방향)·댓글·첨부 없음(Non-Goal, 범위 폭발 방지).
 * 직원의 회신은 읽음확인({@link NoticeRead})뿐이다.
 */
@Entity
@Table(name = "store_notice", indexes = {
        @Index(name = "idx_store_notice_store", columnList = "store_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoreNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_notice_id")
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "body", length = 2000, nullable = false)
    private String body;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private StoreNotice(Long storeId, String title, String body) {
        this.storeId = storeId;
        this.title = title;
        this.body = body;
        this.createdAt = LocalDateTime.now();
    }

    public static StoreNotice create(Long storeId, String title, String body) {
        return new StoreNotice(storeId, title, body);
    }
}
