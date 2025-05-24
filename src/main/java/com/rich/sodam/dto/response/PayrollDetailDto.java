package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PayrollDetail;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 급여 상세 내역 정보를 전달하기 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollDetailDto {
    private Long id;
    private Long payrollId;
    private Long attendanceId;

    // 근무일
    private LocalDate workDate;

    // 근무 시간
    private LocalTime startTime;
    private LocalTime endTime;
    private String workDuration; // "09:00 ~ 18:00" 형태의 근무 시간 표시

    // 계산된 근무 시간
    private Double regularHours;
    private Double overtimeHours;
    private Double nightWorkHours;
    private Double totalHours;

    // 적용된 시급
    private Integer baseHourlyWage;

    // 계산된 급여
    private Integer regularWage;
    private Integer overtimeWage;
    private Integer nightWorkWage;
    private Integer dailyWage;

    // 비고
    private String note;

    // 생성/수정일
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * PayrollDetail 엔티티를 DTO로 변환
     */
    public static PayrollDetailDto from(PayrollDetail detail) {
        if (detail == null) {
            return null;
        }

        return PayrollDetailDto.builder()
                .id(detail.getId())
                .payrollId(detail.getPayroll().getId())
                .attendanceId(detail.getAttendance() != null ? detail.getAttendance().getId() : null)
                .workDate(detail.getWorkDate())
                .startTime(detail.getStartTime())
                .endTime(detail.getEndTime())
                .workDuration(detail.getStartTime() + " ~ " + detail.getEndTime())
                .regularHours(detail.getRegularHours())
                .overtimeHours(detail.getOvertimeHours())
                .nightWorkHours(detail.getNightWorkHours())
                .totalHours(detail.getRegularHours() + detail.getOvertimeHours() + detail.getNightWorkHours())
                .baseHourlyWage(detail.getBaseHourlyWage())
                .regularWage(detail.getRegularWage())
                .overtimeWage(detail.getOvertimeWage())
                .nightWorkWage(detail.getNightWorkWage())
                .dailyWage(detail.getDailyWage())
                .note(detail.getNote())
                .createdAt(detail.getCreatedAt())
                .updatedAt(detail.getUpdatedAt())
                .build();
    }
}