package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Size;

public record ManagerRevocationRequest(@Size(max = 500) String reason) {}
