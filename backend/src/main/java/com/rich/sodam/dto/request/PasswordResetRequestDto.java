package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class PasswordResetRequestDto {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Request {
        @Email @NotBlank
        private String email;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Verify {
        @Email @NotBlank
        private String email;

        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "6자리 숫자")
        private String code;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Confirm {
        @NotBlank
        private String resetTicket;

        @NotBlank
        private String newPassword;
    }
}
