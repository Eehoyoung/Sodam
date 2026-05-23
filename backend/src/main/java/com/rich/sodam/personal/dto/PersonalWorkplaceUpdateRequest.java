package com.rich.sodam.personal.dto;

import lombok.Data;

@Data
public class PersonalWorkplaceUpdateRequest {
    private String name;
    private String address;
    private Integer hourlyWage;
}
