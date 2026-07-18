package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 직원 본인이 본인의 휴가를 셀프 신청하는 DTO.
 * employeeId 는 인증 컨텍스트에서 자동 주입되므로 본 DTO 에 없음.
 *
 * <p>{@code leaveType}/{@code unit}은 생략 시 각각 ANNUAL/FULL_DAY 로 처리된다(기존 FE 호환).
 * unit=HOURS 이면 startDate=endDate(당일)이고 startTime&lt;endTime 이어야 한다(컨트롤러에서 검증).</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffSelfRequest {

    @NotNull
    private Long storeId;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    @NotBlank
    @Size(min = 2, max = 200)
    private String reason;

    /** 휴가 유형(생략 시 ANNUAL). */
    private TimeOffLeaveType leaveType;

    /** 신청 단위(생략 시 FULL_DAY). HALF_DAY/HOURS 는 매장 자체 정책(노사 합의). */
    private TimeOffUnit unit;

    /** unit=HOURS 일 때만 사용. */
    private LocalTime startTime;

    /** unit=HOURS 일 때만 사용. */
    private LocalTime endTime;
}
