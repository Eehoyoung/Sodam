package com.rich.sodam.domain;

import com.rich.sodam.domain.type.UserGrade;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;

    private String name;

    @Enumerated(EnumType.STRING)
    private UserGrade userGrade;

    public User(String email, String name) {
        this.email = email;
        this.name = name;
    }

}
