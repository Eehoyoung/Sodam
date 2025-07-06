package com.rich.sodam.domain;

import com.rich.sodam.util.DateTimeUtils;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 직원 출퇴근 기록 엔티티
 * 직원들의 출근, 퇴근 시간 및 위치 정보를 저장합니다.
 */
@Entity
@Table(name = "attendance", indexes = {
        @Index(name = "idx_attendance_employee_id", columnList = "employee_id"),
        @Index(name = "idx_attendance_store_id", columnList = "store_id"),
        @Index(name = "idx_attendance_check_in_time", columnList = "checkInTime"),
        @Index(name = "idx_attendance_check_out_time", columnList = "checkOutTime"),
        @Index(name = "idx_attendance_employee_store", columnList = "employee_id, store_id"),
        @Index(name = "idx_attendance_date_range", columnList = "checkInTime, checkOutTime")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeProfile employeeProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(nullable = false)
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    // 위치 정보
    @Column(nullable = false)
    private Double checkInLatitude;

    @Column(nullable = false)
    private Double checkInLongitude;

    private Double checkOutLatitude;

    private Double checkOutLongitude;

    // 주휴수당 정보
    @Setter
    private BigDecimal weeklyAllowance;


    // 시급 정보 (당시 적용된 시급)
    @Column(nullable = false)
    private Integer appliedHourlyWage;

    /**
     * 출퇴근 기록 생성자
     *
     * @param employeeProfile 직원 프로필
     * @param store           매장 정보
     */
    public Attendance(EmployeeProfile employeeProfile, Store store) {
        this.employeeProfile = employeeProfile;
        this.store = store;
    }

    /**
     * 출근 처리
     * 현재 시간을 출근 시간으로 기록하고 위치 정보와 시급을 저장합니다.
     *
     * @param latitude   위도
     * @param longitude  경도
     * @param hourlyWage 적용 시급
     * @throws IllegalStateException 이미 출근 처리된 경우
     */
    public void checkIn(Double latitude, Double longitude, Integer hourlyWage) {
        if (this.checkInTime != null) {
            throw new IllegalStateException("이미 출근 처리가 되었습니다.");
        }
        this.checkInTime = LocalDateTime.now();
        this.checkInLatitude = latitude;
        this.checkInLongitude = longitude;
        this.appliedHourlyWage = hourlyWage;
    }

    /**
     * 퇴근 처리
     * 현재 시간을 퇴근 시간으로 기록하고 위치 정보를 저장합니다.
     *
     * @param latitude  위도
     * @param longitude 경도
     * @throws IllegalStateException 출근 처리가 되지 않았거나 이미 퇴근 처리된 경우
     */
    public void checkOut(Double latitude, Double longitude) {
        if (this.checkInTime == null) {
            throw new IllegalStateException("출근 처리가 되어있지 않습니다.");
        }
        if (this.checkOutTime != null) {
            throw new IllegalStateException("이미 퇴근 처리가 되었습니다.");
        }
        this.checkOutTime = LocalDateTime.now();
        this.checkOutLatitude = latitude;
        this.checkOutLongitude = longitude;
    }

    /**
     * 근무 시간 계산 (분 단위)
     *
     * @return 근무 시간 (분)
     */
    public long getWorkingTimeInMinutes() {
        if (checkInTime != null && checkOutTime != null) {
            // DateTimeUtils 활용
            return DateTimeUtils.getMinutesBetween(checkInTime, checkOutTime);
        }
        return 0;
    }

    /**
     * 근무 시간 계산 (시간 단위, 소수점 한 자리까지)
     *
     * @return 근무 시간 (시간, 소수점 한 자리)
     */
    public double getWorkingTimeInHours() {
        // DateTimeUtils 활용
        long minutes = getWorkingTimeInMinutes();
        return minutes / 60.0;
    }


    /**
     * 일일 급여 계산
     *
     * @return 계산된 일일 급여
     */
    public int calculateDailyWage() {
        double hours = getWorkingTimeInHours();
        return (int) (hours * appliedHourlyWage);
    }

}
