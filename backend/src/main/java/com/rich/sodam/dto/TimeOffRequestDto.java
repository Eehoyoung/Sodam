package com.rich.sodam.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 휴가 신청 생성을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffRequestDto {
    private Long employeeId;
    private Long storeId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    private String reason;
}
