package com.rich.sodam.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GeocodingResult {

    private Double latitude;       // 위도

    private Double longitude;      // 경도

    private String roadAddress;    // 도로명 주소

    private String jibunAddress;   // 지번 주소

    private String fullAddress;    // 전체 주소

}
