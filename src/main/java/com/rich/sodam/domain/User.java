package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.rich.sodam.domain.type.UserGrade;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    private String email;

    private String name;

    @Enumerated(EnumType.STRING)
    private UserGrade userGrade;

    public User(String email, String name) {
        this.email = email;
        this.name = name;
        this.userGrade = UserGrade.NORMAL;
    }

    // 역할 변경 메소드
    public void changeToMaster() {
        this.userGrade = UserGrade.MASTER;
    }

    public void changeToEmployee() {
        this.userGrade = UserGrade.EMPLOYEE;
    }
}