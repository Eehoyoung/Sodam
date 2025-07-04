package com.rich.sodam.domain;

import com.rich.sodam.domain.type.UserGrade;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(nullable = false, unique = true) // 이메일은 유일해야 함
    private String email;

    private String name;

    @Enumerated(EnumType.STRING)
    private UserGrade userGrade;

    // 생성 시간 필드 추가
    private LocalDateTime createdAt;

    private String password;


    public User(String email, String name) {
        this.email = email;
        this.name = name;
        this.userGrade = UserGrade.NORMAL;
    }

    public User(Long id, String email, String name, UserGrade userGrade, LocalDateTime createdAt, String password) {
    }

    // 역할 변경 메소드
    public void changeToMaster() {
        this.userGrade = UserGrade.MASTER;
    }

    public void changeToEmployee() {
        this.userGrade = UserGrade.EMPLOYEE;
    }
}
