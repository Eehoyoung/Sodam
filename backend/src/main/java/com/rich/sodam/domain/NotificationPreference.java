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

    /**
     * 정보통신망법 §50③이 요구하는 야간(21:00~08:00) 광고성 정보 전송 제한 구간.
     * 이용자의 방해금지시간 설정과 무관하게 적용된다 — 그 설정은 §50③이 요구하는
     * "별도의 사전 동의"를 갈음하지 못하기 때문이다.
     */
    private static final LocalTime AD_NIGHT_BLOCK_START = LocalTime.of(21, 0);
    private static final LocalTime AD_NIGHT_BLOCK_END = LocalTime.of(8, 0);

    /** 인앱 이력과 분리된 외부 푸시의 수신 허용 여부다. */
    public boolean allows(NotificationInbox.Category category, LocalTime now) {
        if (!master || !allowsCategory(category)) {
            return false;
        }
        // 광고성 정보의 야간 전송은 별도 동의 없이는 불가하므로, 수신 동의(marketing=true)만으로
        // 열지 않는다. 별도 동의 항목이 생기기 전까지는 이 구간을 항상 막는다.
        if (category == NotificationInbox.Category.MARKETING
                && isWithin(now, AD_NIGHT_BLOCK_START, AD_NIGHT_BLOCK_END)) {
            return false;
        }
        if (!quietHoursEnabled) {
            return true;
        }
        return !isWithin(now, LocalTime.parse(quietStart), LocalTime.parse(quietEnd));
    }

    /** 자정을 넘는 구간(예: 22:00~07:00)까지 처리한다. start == end 는 24시간 전체로 본다. */
    private static boolean isWithin(LocalTime now, LocalTime start, LocalTime end) {
        if (start.equals(end)) {
            return true;
        }
        return start.isBefore(end)
                ? !now.isBefore(start) && now.isBefore(end)
                : !now.isBefore(start) || now.isBefore(end);
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
