package com.rich.sodam.domain.type;

import lombok.Getter;

@Getter
public enum UserGrade {

    NORMAL("ROLE_USER"),
    EMPLOYEE("ROLE_EMPLOYEE"),
    MASTER("ROLE_MASTER"),
    MANAGER("ROLE_MANAGER");

    private final String value;

    UserGrade(String value) {
        this.value = value;
    }

}
