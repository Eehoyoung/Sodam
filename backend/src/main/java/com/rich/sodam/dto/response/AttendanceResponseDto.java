package com.rich.sodam.dto.response;

import com.rich.sodam.domain.Attendance;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 출퇴근 기록 응답 DTO
 * 클라이언트에게 필요한 출퇴근 기록 정보만 반환하기 위한 데이터 전송 객체입니다.
 */
@Getter
@Builder
public class AttendanceResponseDto {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long storeId;
    private String storeName;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Double checkInLatitude;
    private Double checkInLongitude;
    private Double checkOutLatitude;
    private Double checkOutLongitude;
    private Integer appliedHourlyWage;
    private Double workingHours;
    private Integer dailyWage;

    /**
     * Attendance 엔티티를 AttendanceResponseDto로 변환
     *
     * @param attendance 출퇴근 기록 엔티티
     * @return 변환된 응답 DTO
     */
    public static AttendanceResponseDto from(Attendance attendance) {
        if (attendance == null) return null;

        var employeeProfile = attendance.getEmployeeProfile();
        var store = attendance.getStore();
        var user = employeeProfile != null ? employeeProfile.getUser() : null;

        Integer hourlyWage = attendance.getAppliedHourlyWage();
        // 일급 계산은 시급/퇴근시간이 모두 있을 때만 수행 — null 시급 NPE 방지.
        Integer dailyWage = (attendance.getCheckOutTime() != null && hourlyWage != null)
                ? attendance.calculateDailyWage()
                : null;

        return AttendanceResponseDto.builder()
                .id(attendance.getId())
                .employeeId(employeeProfile != null ? employeeProfile.getId() : null)
                .employeeName(user != null ? user.getName() : null)
                .storeId(store != null ? store.getId() : null)
                .storeName(store != null ? store.getStoreName() : null)
                .checkInTime(attendance.getCheckInTime())
                .checkOutTime(attendance.getCheckOutTime())
                .checkInLatitude(attendance.getCheckInLatitude())
                .checkInLongitude(attendance.getCheckInLongitude())
                .checkOutLatitude(attendance.getCheckOutLatitude())
                .checkOutLongitude(attendance.getCheckOutLongitude())
                .appliedHourlyWage(hourlyWage)
                .workingHours(attendance.getWorkingTimeInHours())
                .dailyWage(dailyWage)
                .build();
    }
}