package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferenceUpdateRequest {

    @NotNull private Boolean master;
    @NotNull private Boolean attendance;
    @NotNull private Boolean payroll;
    @NotNull private Boolean billing;
    @NotNull private Boolean marketing;
    @NotNull private Boolean quietHoursEnabled;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String quietStart;

    @NotNull
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String quietEnd;
}
