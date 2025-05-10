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
    private EmployeeProfile employee;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private Double checkInLatitude;

    private Double checkInLongitude;

    private Double checkOutLatitude;

    private Double checkOutLongitude;

    private boolean locationVerified;
}