package com.rich.sodam.domain;

import com.rich.sodam.domain.type.TimeOffStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

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

    // 생성자
    public TimeOff(EmployeeProfile employee, Store store, LocalDate startDate, LocalDate endDate, String reason) {
        this.employee = employee;
        this.store = store;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
        this.status = TimeOffStatus.PENDING;
    }

    // 휴가 승인 메소드
    public void approve() {
        this.status = TimeOffStatus.APPROVED;
    }

    // 휴가 거부 메소드
    public void reject() {
        this.status = TimeOffStatus.REJECTED;
    }
}
