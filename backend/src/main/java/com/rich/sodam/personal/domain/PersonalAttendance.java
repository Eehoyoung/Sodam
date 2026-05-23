package com.rich.sodam.personal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * 개인 출퇴근 기록 엔터티
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "personal_attendance",
       indexes = {
           @Index(name = "idx_pa_user_id_id_desc", columnList = "user_id, id"),
           @Index(name = "idx_pa_user_check_in", columnList = "user_id, check_in_at")
       })
public class PersonalAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "workplace_id")
    private Long workplaceId; // nullable

    @Column(name = "check_in_at", nullable = false)
    private OffsetDateTime checkInAt;

    @Column(name = "check_out_at")
    private OffsetDateTime checkOutAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "note", length = 500)
    private String note;

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
