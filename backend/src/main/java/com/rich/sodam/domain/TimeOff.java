package com.rich.sodam.domain;

import com.rich.sodam.core.payroll.leave.TimeOffConsumptionCalculator;
import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.domain.type.TimeOffUnit;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class TimeOff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employee;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;

    @Enumerated(EnumType.STRING)
    private TimeOffStatus status;

    /** 휴가 유형(연차/무급/기타). 연차만 잔여 연차 검증·차감 대상. 기존 데이터 호환 위해 기본 ANNUAL. */
    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", length = 20, nullable = false)
    private TimeOffLeaveType leaveType = TimeOffLeaveType.ANNUAL;

    /** 신청 단위(종일/반차/시간). 반차·시간 단위는 매장 자체 정책(노사 합의) — 기본 종일. */
    @Enumerated(EnumType.STRING)
    @Column(name = "unit", length = 20, nullable = false)
    private TimeOffUnit unit = TimeOffUnit.FULL_DAY;

    /** unit=HOURS 일 때만 사용. startDate=endDate(당일)이고 startTime&lt;endTime 이어야 한다. */
    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    /**
     * 거부 사유. §60⑤ 시기변경권("사업 운영에 막대한 지장")이 사장이 연차 사용을 거부할 수 있는
     * 유일한 법적 근거다 — 사유 입력을 강제해 이 요건을 유도한다(단순 반려 방지).
     */
    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    // 생성자 — 종일 연차(기존 호출부 호환).
    public TimeOff(EmployeeProfile employee, Store store, LocalDate startDate, LocalDate endDate, String reason) {
        this.employee = employee;
        this.store = store;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
        this.status = TimeOffStatus.PENDING;
        this.leaveType = TimeOffLeaveType.ANNUAL;
        this.unit = TimeOffUnit.FULL_DAY;
    }

    // 유형·단위·시간까지 지정하는 확장 생성자.
    public TimeOff(EmployeeProfile employee, Store store, TimeOffLeaveType leaveType, TimeOffUnit unit,
                   LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime, String reason) {
        this.employee = employee;
        this.store = store;
        this.leaveType = leaveType != null ? leaveType : TimeOffLeaveType.ANNUAL;
        this.unit = unit != null ? unit : TimeOffUnit.FULL_DAY;
        this.startDate = startDate;
        this.endDate = endDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.reason = reason;
        this.status = TimeOffStatus.PENDING;
    }

    // 휴가 승인 메소드
    public void approve() {
        this.status = TimeOffStatus.APPROVED;
    }

    // 휴가 거부 메소드 — 사유 필수(§60⑤ 유도).
    public void reject(String rejectReason) {
        this.status = TimeOffStatus.REJECTED;
        this.rejectReason = rejectReason;
    }

    /**
     * 소비 일수(연차 잔여 차감 환산). leaveType 과 무관하게 신청 규모를 나타내지만,
     * 실제 잔여 연차 차감 대상은 leaveType=ANNUAL 인 경우뿐이다(호출측이 필터링).
     *
     * @param dailyContractedHours unit=HOURS 환산에 쓸 계약상 1일 소정근로시간(모르면 null → 8시간 기본)
     * @param scheduledWorkDays    unit=FULL_DAY 소정근로일 판정에 쓸 근무 요일 집합(모르면 null → 역일수 폴백)
     */
    public double computeConsumedDays(Double dailyContractedHours, Set<DayOfWeek> scheduledWorkDays) {
        return switch (unit) {
            case FULL_DAY -> TimeOffConsumptionCalculator.fullDayConsumedDays(startDate, endDate, scheduledWorkDays);
            case HALF_DAY -> TimeOffConsumptionCalculator.halfDayConsumedDays();
            case HOURS -> TimeOffConsumptionCalculator.hoursConsumedDays(startTime, endTime, dailyContractedHours);
        };
    }
}
