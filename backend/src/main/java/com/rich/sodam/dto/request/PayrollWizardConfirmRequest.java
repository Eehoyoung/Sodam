package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 웹 콘솔 급여 정산 마법사 3단계("확정") 일괄 요청.
 *
 * <p>{@code /api/payroll/calculate}(배치 프리뷰)로 계산·검토를 마친 여러 직원의 급여를
 * 사장이 한 화면에서 한 번에 확정("발급")할 때 사용한다. 트랜잭션 경계를 백엔드가 갖도록
 * 이 목록 전체를 한 트랜잭션으로 처리한다 — 02_API_활용계획.md §6.
 */
public record PayrollWizardConfirmRequest(
        @NotNull Long storeId,

        @NotEmpty List<Long> payrollIds,

        @NotBlank @Size(max = 200)
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        String stepUpPassword
) {
}
