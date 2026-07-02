package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 공지 읽음확인 (M-NEW-04/E-NEW-06). 직원이 "확인했어요"로 회신하면 1건 기록.
 *
 * <p>멱등성: (noticeId, employeeId) 유니크. 같은 직원이 여러 번 눌러도 1건만 남는다.
 * employeeId 는 {@code EmployeeProfile.id}(= User.id) 다.
 */
@Entity
@Table(name = "notice_read", uniqueConstraints = {
        @UniqueConstraint(name = "uq_notice_read_notice_emp", columnNames = {"notice_id", "employee_id"})
}, indexes = {
        @Index(name = "idx_notice_read_emp", columnList = "employee_id"),
        @Index(name = "idx_notice_read_notice", columnList = "notice_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NoticeRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notice_read_id")
    private Long id;

    @Column(name = "notice_id", nullable = false)
    private Long noticeId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "read_at", nullable = false)
    private LocalDateTime readAt;

    private NoticeRead(Long noticeId, Long employeeId) {
        this.noticeId = noticeId;
        this.employeeId = employeeId;
        this.readAt = LocalDateTime.now();
    }

    public static NoticeRead create(Long noticeId, Long employeeId) {
        return new NoticeRead(noticeId, employeeId);
    }
}
