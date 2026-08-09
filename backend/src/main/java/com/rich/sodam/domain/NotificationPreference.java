package com.rich.sodam.domain;

import com.rich.sodam.dto.request.NotificationPreferenceUpdateRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * User-scoped notification delivery preferences. This is deliberately not a
 * store resource: the authenticated user ID is the only ownership key.
 */
@Entity
@Table(name = "notification_preference")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationPreference {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "master_enabled", nullable = false)
    private boolean master;

    @Column(name = "attendance_enabled", nullable = false)
    private boolean attendance;

    @Column(name = "payroll_enabled", nullable = false)
    private boolean payroll;

    @Column(name = "billing_enabled", nullable = false)
    private boolean billing;

    @Column(name = "marketing_enabled", nullable = false)
    private boolean marketing;

    @Column(name = "quiet_hours_enabled", nullable = false)
    private boolean quietHoursEnabled;

    @Column(name = "quiet_start", nullable = false, length = 5)
    private String quietStart;

    @Column(name = "quiet_end", nullable = false, length = 5)
    private String quietEnd;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private NotificationPreference(Long userId) {
        this.userId = userId;
        this.master = true;
        this.attendance = true;
        this.payroll = true;
        this.billing = true;
        this.marketing = false;
        this.quietHoursEnabled = false;
        this.quietStart = "22:00";
        this.quietEnd = "07:00";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public static NotificationPreference defaultsFor(Long userId) {
        return new NotificationPreference(userId);
    }

    public void update(NotificationPreferenceUpdateRequest request) {
        this.master = request.getMaster();
        this.attendance = request.getAttendance();
        this.payroll = request.getPayroll();
        this.billing = request.getBilling();
        this.marketing = request.getMarketing();
        this.quietHoursEnabled = request.getQuietHoursEnabled();
        this.quietStart = request.getQuietStart();
        this.quietEnd = request.getQuietEnd();
        this.updatedAt = LocalDateTime.now();
    }

    /** 인앱 이력과 분리된 외부 푸시의 수신 허용 여부다. */
    public boolean allows(NotificationInbox.Category category, LocalTime now) {
        if (!master || !allowsCategory(category)) {
            return false;
        }
        if (!quietHoursEnabled) {
            return true;
        }
        LocalTime start = LocalTime.parse(quietStart);
        LocalTime end = LocalTime.parse(quietEnd);
        boolean inQuietHours = start.equals(end)
                || (start.isBefore(end) ? !now.isBefore(start) && now.isBefore(end)
                : !now.isBefore(start) || now.isBefore(end));
        return !inQuietHours;
    }

    private boolean allowsCategory(NotificationInbox.Category category) {
        return switch (category) {
            case ATTENDANCE -> attendance;
            case PAYROLL -> payroll;
            case BILLING -> billing;
            case MARKETING -> marketing;
            case NOTICE, SYSTEM -> true;
        };
    }
}
