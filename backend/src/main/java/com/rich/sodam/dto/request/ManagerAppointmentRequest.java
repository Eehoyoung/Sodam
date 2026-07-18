package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.ManagerPermission;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record ManagerAppointmentRequest(@NotNull Long employeeId, Set<ManagerPermission> permissions) {}
