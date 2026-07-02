package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * 직원 본인이 본인의 휴가를 셀프 신청하는 DTO.
 * employeeId 는 인증 컨텍스트에서 자동 주입되므로 본 DTO 에 없음.
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
}
