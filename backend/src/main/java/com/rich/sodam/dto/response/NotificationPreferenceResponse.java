package com.rich.sodam.dto.response;

import com.rich.sodam.domain.NotificationPreference;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NotificationPreferenceResponse {
    private boolean master;
    private boolean attendance;
    private boolean payroll;
    private boolean billing;
    private boolean marketing;
    private boolean quietHoursEnabled;
    private String quietStart;
    private String quietEnd;

    public static NotificationPreferenceResponse from(NotificationPreference preference) {
        return new NotificationPreferenceResponse(
                preference.isMaster(),
                preference.isAttendance(),
                preference.isPayroll(),
                preference.isBilling(),
                preference.isMarketing(),
                preference.isQuietHoursEnabled(),
                preference.getQuietStart(),
                preference.getQuietEnd());
    }
}
