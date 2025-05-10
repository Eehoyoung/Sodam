package com.rich.sodam.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LocationUpdateDto {

    private Integer radius;

    private String fullAddress;

    private Double latitude;

    private Double longitude;

}