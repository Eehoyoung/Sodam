package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PayrollIssueRequest(
        @NotBlank @Size(max = 200)
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        String stepUpPassword
) {}
