package com.rich.sodam.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 매장 일괄 급여 계산 결과.
 *
 * <p>실패한 직원을 응답에서 그냥 빼면 사장님은 "몇 명이 왜 빠졌는지" 알 방법이 없다. 급여 계산은
 * 정확하지 않으면 중단하도록 설계돼 있는데(fail-closed), 중단 사실이 전달되지 않으면 결과적으로
 * 미지급이 되어 오히려 더 나쁘다. 그래서 성공분과 실패분을 함께 내려보낸다.</p>
 */
@Getter
@AllArgsConstructor
public class PayrollBatchResultDto {

    /** 계산에 성공한 직원의 급여. 필드명이 {@code data} 인 것은 기존 FE 파싱 경로와 맞추기 위함이다. */
    private final List<PayrollDto> data;

    /** 계산이 중단된 직원. 비어 있으면 전원 성공. */
    private final List<FailedEmployee> failed;

    @Getter
    @AllArgsConstructor
    public static class FailedEmployee {
        private final Long employeeId;
        private final String employeeName;
        /** FE 가 분기할 수 있는 코드. 원인이 BusinessException 이 아니면 UNKNOWN. */
        private final String errorCode;
        private final String message;
    }
}
