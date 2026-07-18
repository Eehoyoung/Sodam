package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.PayrollStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

/**
 * 급여 상태 업데이트 요청을 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollStatusUpdateDto {

    @NotNull(message = "급여 상태는 필수 항목입니다")
    private PayrollStatus status;

    // 지급 완료 상태로 변경할 경우 지급일 설정
    private LocalDate paymentDate;

    // 취소 사유 (취소 상태로 변경할 경우)
    private String cancelReason;

    /** 확정·지급 같은 고위험 전이에만 사용하며 저장·로그·응답하지 않는다. */
    @Size(max = 200)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String stepUpPassword;
}
