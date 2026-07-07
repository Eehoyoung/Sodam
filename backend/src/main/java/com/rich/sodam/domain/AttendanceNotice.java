package com.rich.sodam.domain;

import com.rich.sodam.domain.type.AttendanceNoticeType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 직원의 지각/조퇴/결근 사전 신고. 사장에게 알리는 용도일 뿐 임금 계산에 영향을 주지 않는다
 * — 실제 공제 여부는 사후에 {@link AttendanceIrregularity} 확정 단계에서 사장이 결정한다.
 */
@Entity
@Table(name = "attendance_notice", indexes = {
        @Index(name = "idx_an_employee_store_date", columnList = "employee_id, store_id, for_date"),
        @Index(name = "idx_attendance_notice_store_id", columnList = "store_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "an_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "for_date", nullable = false)
    private LocalDate forDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AttendanceNoticeType type;

    @Column(length = 300)
    private String message;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static AttendanceNotice create(Long employeeId, Long storeId, LocalDate forDate,
                                          AttendanceNoticeType type, String message) {
        AttendanceNotice n = new AttendanceNotice();
        n.employeeId = employeeId;
        n.storeId = storeId;
        n.forDate = forDate;
        n.type = type;
        n.message = message;
        n.createdAt = LocalDateTime.now();
        return n;
    }
}
