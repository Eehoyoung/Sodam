package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 급여 발급 요청.
 *
 * @param stepUpPassword   고위험 작업 재인증용 비밀번호
 * @param adjustment       가감조정액(원, 세후 가산. 음수=차감). null/0 이면 조정 없음
 * @param adjustmentReason 가감조정 사유. adjustment 가 0이 아니면 필수(임금명세서 §48② 항목 표기용)
 */
public record PayrollIssueRequest(
        @NotBlank @Size(max = 200)
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
        String stepUpPassword,

        Integer adjustment,

        @Size(max = 200)
        String adjustmentReason
) {
    /** 조정액이 있는데 사유가 비었으면 발급을 막는다(누가·왜 깎았는지 남지 않는 급여 변경 금지). */
    @jakarta.validation.constraints.AssertTrue(message = "가감조정 사유를 입력해 주세요.")
    public boolean isAdjustmentReasonPresentWhenAdjusted() {
        return adjustment == null || adjustment == 0
                || (adjustmentReason != null && !adjustmentReason.isBlank());
    }
}
