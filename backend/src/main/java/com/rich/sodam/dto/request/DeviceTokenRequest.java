package com.rich.sodam.dto.request;

import com.rich.sodam.domain.DeviceToken.Platform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DeviceTokenRequest {

    @NotBlank
    private String token;

    @NotNull
    private Platform platform;
}
