package com.rich.sodam.personal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 개인 사용자 프로필 엔터티
 * - userId가 PK이며, 존재하지 않으면 최초 접근 시 생성됩니다.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "personal_user_profile")
public class PersonalUserProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "default_hourly_wage")
    private Integer defaultHourlyWage; // null 허용

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
