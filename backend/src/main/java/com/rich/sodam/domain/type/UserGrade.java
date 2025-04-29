package com.rich.sodam.domain.type;

import lombok.Getter;

@Getter
public enum UserGrade {

    NORMAL("ROLE_USER"),
    EMP("ROLE_EMP"),
    MAS("ROLE_MAS");

    private final String value;

    UserGrade(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }


}
