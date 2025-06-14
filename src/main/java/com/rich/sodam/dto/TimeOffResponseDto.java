package com.rich.sodam.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 휴가 신청 응답을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TimeOffResponseDto {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long storeId;
    private String storeName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    private String reason;
    private TimeOffStatus status;

    /**
     * TimeOff 엔티티를 TimeOffResponseDto로 변환
     */
    public static TimeOffResponseDto fromEntity(TimeOff timeOff) {
        TimeOffResponseDto dto = new TimeOffResponseDto();
        dto.setId(timeOff.getId());
        dto.setEmployeeId(timeOff.getEmployee().getId());
        dto.setEmployeeName(timeOff.getEmployee().getUser().getName());
        dto.setStoreId(timeOff.getStore().getId());
        dto.setStoreName(timeOff.getStore().getStoreName());
        dto.setStartDate(timeOff.getStartDate());
        dto.setEndDate(timeOff.getEndDate());
        dto.setReason(timeOff.getReason());
        dto.setStatus(timeOff.getStatus());
        return dto;
    }
}
