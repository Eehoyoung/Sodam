package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.ManagerPermission;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record ManagerPermissionUpdateRequest(@NotEmpty Set<ManagerPermission> permissions) {}
