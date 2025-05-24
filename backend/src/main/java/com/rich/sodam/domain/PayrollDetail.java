package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "payroll_detail")
@Getter
@Setter
@NoArgsConstructor
public class PayrollDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "payroll_id")
    private Payroll payroll;

    @OneToOne
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    // 근무일
    private LocalDate workDate;

    // 근무 시간 (시:분)
    private LocalTime startTime;
    private LocalTime endTime;

    // 계산된 근무 시간
    private Double regularHours;    // 기본 근무 시간
    private Double overtimeHours;   // 초과 근무 시간
    private Double nightWorkHours;  // 야간 근무 시간

    // 적용된 시급
    private Integer baseHourlyWage;

    // 계산된 급여
    private Integer regularWage;    // 기본 급여
    private Integer overtimeWage;   // 초과 근무 수당
    private Integer nightWorkWage;  // 야간 근무 수당
    private Integer dailyWage;      // 일 총액

    // 비고
    private String note;

    // 생성일/수정일
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
