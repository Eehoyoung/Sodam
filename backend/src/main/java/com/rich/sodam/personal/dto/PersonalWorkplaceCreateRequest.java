package com.rich.sodam.personal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PersonalWorkplaceCreateRequest {
    @NotBlank(message = "근무지 이름은 필수입니다.")
    private String name;
    private String address;
    private Integer hourlyWage;
}
