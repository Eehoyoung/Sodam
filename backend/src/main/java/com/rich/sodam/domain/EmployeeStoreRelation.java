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
public class EmployeeStoreRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private EmployeeProfile employeeProfile;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private LocalDateTime joinedAt;

    public EmployeeStoreRelation(EmployeeProfile employeeProfile, Store store) {
        this.employeeProfile = employeeProfile;
        this.store = store;
        this.joinedAt = LocalDateTime.now();
    }
}