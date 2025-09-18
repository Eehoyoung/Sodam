package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 사이트 질문 엔티티
 * 사이트 관련 질문과 답변을 저장하는 엔티티입니다.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class QnaInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qna_info_id")
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String question;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column
    private String imagePath;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
