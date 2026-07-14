package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Q&A 화면의 1:1 문의(비공개 고객 문의). 공개 FAQ/팁 콘텐츠(QnaInfo)와는 별개 도메인이다 —
 * 사용자가 남긴 이름·이메일이 공개 게시판에 노출되면 안 되므로 혼용 금지.
 */
@Entity
@Table(name = "customer_inquiry", indexes = {
        @Index(name = "idx_customer_inquiry_requester", columnList = "requester_user_id"),
        @Index(name = "idx_customer_inquiry_created_at", columnList = "createdAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "customer_inquiry_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_user_id", nullable = false)
    private User requester;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 190)
    private String email;

    @Lob
    @Column(nullable = false, length = 2000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static CustomerInquiry create(User requester, String name, String email, String content) {
        CustomerInquiry inquiry = new CustomerInquiry();
        inquiry.requester = requester;
        inquiry.name = name;
        inquiry.email = email;
        inquiry.content = content;
        inquiry.createdAt = LocalDateTime.now();
        return inquiry;
    }
}
