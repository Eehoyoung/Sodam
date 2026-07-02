package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employee_profile", indexes = {
        @Index(name = "idx_employee_number", columnList = "employeeNumber"),
        @Index(name = "idx_employee_user_id", columnList = "user_id"),
        @Index(name = "idx_employee_weekly_allowance", columnList = "startWeeklyAllowance, endWeeklyAllowance")
})
@Getter
@Setter
@NoArgsConstructor
public class EmployeeProfile {

    @Id
    private Long id;  // User의 ID와 동일

    @OneToOne
    @MapsId  // User의 ID를 PK로 사용
    @JoinColumn(name = "user_id")
    private User user;

    // 사원 전용 필드
    private String employeeNumber;

    // 주휴수당 계산을 위한 필드 추가
    private LocalDate startWeeklyAllowance;

    private LocalDate endWeeklyAllowance;

    private BigDecimal incompleteWeekAllowance;

    public EmployeeProfile(User user) {
        this.user = user;
        this.employeeNumber = generateEmployeeNumber();
    }

    // 사원번호 생성 메서드
    private String generateEmployeeNumber() {
        return "EMP" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
