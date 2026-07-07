package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffUnit;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * RN 호환을 위한 JSON 본문 기반 휴가 생성 요청 DTO.
 *
 * <p>{@code leaveType}/{@code unit}은 생략 시 각각 ANNUAL/FULL_DAY 로 처리된다(기존 FE 호환).</p>
 */
public class TimeOffCreateRequest {

    @NotNull
    private Long employeeId;

    @NotNull
    private Long storeId;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @NotNull
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    @NotNull
    private String reason;

    /** 휴가 유형(생략 시 ANNUAL). */
    private TimeOffLeaveType leaveType;

    /** 신청 단위(생략 시 FULL_DAY). */
    private TimeOffUnit unit;

    /** unit=HOURS 일 때만 사용. */
    private LocalTime startTime;

    /** unit=HOURS 일 때만 사용. */
    private LocalTime endTime;

    public Long getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public TimeOffLeaveType getLeaveType() {
        return leaveType;
    }

    public void setLeaveType(TimeOffLeaveType leaveType) {
        this.leaveType = leaveType;
    }

    public TimeOffUnit getUnit() {
        return unit;
    }

    public void setUnit(TimeOffUnit unit) {
        this.unit = unit;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }
}
