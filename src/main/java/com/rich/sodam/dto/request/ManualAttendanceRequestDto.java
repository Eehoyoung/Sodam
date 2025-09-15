package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 수동 출퇴근 등록 요청 DTO
 * 사업주가 직원 대신 출퇴근 기록을 수동으로 등록할 때 사용하는 데이터 전송 객체입니다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualAttendanceRequestDto {

    @NotNull(message = "직원 ID는 필수입니다.")
    private Long employeeId;

    @NotNull(message = "매장 ID는 필수입니다.")
    private Long storeId;

    @NotNull(message = "등록자 ID는 필수입니다.")
    private Long registeredBy;

    @NotNull(message = "출근 시간은 필수입니다.")
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    @Size(max = 500, message = "등록 사유는 500자를 초과할 수 없습니다.")
    private String reason;

    /**
     * 출근만 등록하는 경우인지 확인
     */
    public boolean isCheckInOnly() {
        return checkOutTime == null;
    }

    /**
     * 출퇴근 모두 등록하는 경우인지 확인
     */
    public boolean isFullAttendance() {
        return checkOutTime != null;
    }
}
