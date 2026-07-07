package com.rich.sodam.dto.response;

import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.domain.type.TimeOffUnit;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 휴가 신청 응답 DTO. {@code TimeOffController}가 {@code TimeOff} 엔티티를 직접 반환하지
 * 않도록 필드를 선별한다(연관 엔티티 지연로딩·불필요 필드 노출 방지).
 *
 * <p>기존 FE 계약과의 호환을 위해 {@code startDate}/{@code endDate}/{@code reason}/{@code status}
 * 필드명은 그대로 유지하고, {@code leaveType}/{@code unit}/{@code startTime}/{@code endTime}/
 * {@code consumedDays}/{@code rejectReason}만 신규 추가한다.</p>
 *
 * @param consumedDays 이 신청이 소비하는 연차 환산 일수(FULL_DAY=날짜 수, HALF_DAY=0.5,
 *                     HOURS=신청시간 ÷ 계약상 1일 소정근로시간). leaveType 과 무관하게 계산되며,
 *                     실제 연차 잔여 차감 대상 여부는 leaveType=ANNUAL 인 경우로 호출측이 판단한다.
 */
public record TimeOffResponse(
        Long id,
        Long employeeId,
        String employeeName,
        Long storeId,
        TimeOffLeaveType leaveType,
        TimeOffUnit unit,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        double consumedDays,
        String reason,
        String rejectReason,
        TimeOffStatus status
) {
}
