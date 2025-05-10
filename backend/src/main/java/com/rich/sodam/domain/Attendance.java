package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employeeProfile;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;

    // 위치 정보
    private Double checkInLatitude;
    private Double checkInLongitude;
    private Double checkOutLatitude;
    private Double checkOutLongitude;

    // 시급 정보 (당시 적용된 시급)
    private Integer appliedHourlyWage;

    public Attendance(EmployeeProfile employeeProfile, Store store) {
        this.employeeProfile = employeeProfile;
        this.store = store;
    }

    // 출근 처리
    public void checkIn(Double latitude, Double longitude, Integer hourlyWage) {
        this.checkInTime = LocalDateTime.now();
        this.checkInLatitude = latitude;
        this.checkInLongitude = longitude;
        this.appliedHourlyWage = hourlyWage;
    }

    // 퇴근 처리
    public void checkOut(Double latitude, Double longitude) {
        this.checkOutTime = LocalDateTime.now();
        this.checkOutLatitude = latitude;
        this.checkOutLongitude = longitude;
    }

    // 근무 시간 계산 (분 단위)
    public long getWorkingTimeInMinutes() {
        if (checkInTime != null && checkOutTime != null) {
            return java.time.Duration.between(checkInTime, checkOutTime).toMinutes();
        }
        return 0;
    }
}