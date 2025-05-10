package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Random;

@Entity
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

    public EmployeeProfile(User user) {
        this.user = user;
        this.employeeNumber = generateEmployeeNumber();
    }

    // 사원번호 생성 메서드
    private String generateEmployeeNumber() {
        return "EMP" + System.currentTimeMillis() +
                (new Random().nextInt(900) + 100);
    }
}