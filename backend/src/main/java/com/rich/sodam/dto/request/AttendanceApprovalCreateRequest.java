package com.rich.sodam.dto.request;

import com.rich.sodam.domain.AttendanceApprovalRequest.Type;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * 사장 승인 출퇴근 요청 생성 (직원). 요청 시각은 BE 가 서버시각으로 기록(과거 위조 방지).
 */
@Getter
@Setter
public class AttendanceApprovalCreateRequest {

    @NotNull(message = "매장을 선택해 주세요.")
    private Long storeId;

    @NotNull(message = "요청 유형(CHECK_IN/CHECK_OUT)을 입력해 주세요.")
    private Type type;
}
