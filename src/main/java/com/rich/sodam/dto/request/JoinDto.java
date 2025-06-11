package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.UserGrade;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
public class JoinDto {

    private Long id;

    private String email;

    private String password;

    private String name;

    private UserGrade userGrade;

}
