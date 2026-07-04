package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 대타 승인 요청 — 승인할 지원 직원 ID.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SwapApproveRequest {

    @NotNull(message = "승인할 직원 ID는 필수입니다.")
    private Long employeeId;
}
