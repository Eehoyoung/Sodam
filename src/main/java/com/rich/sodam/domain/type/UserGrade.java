package com.rich.sodam.domain.type;

import lombok.Getter;

@Getter
public enum UserGrade {

    Personal("ROLE_USER"),
    EMPLOYEE("ROLE_EMPLOYEE"),
    BOSSES("ROLE_BOSS"),

    MASTER("ROLE_MASTER"),
    MANAGER("ROLE_MANAGER");

    private final String value;

    UserGrade(String value) {
        this.value = value;
    }

}
