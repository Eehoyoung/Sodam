package com.rich.sodam.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StoreRegistrationDto {

    private String storeName;

    private String businessNumber;

    private String storePhoneNumber;

    private String businessType;

    private String businessLicenseNumber;

    // 위치 정보 추가
    private String fullAddress;    // 전체 주소

    private String roadAddress;    // 도로명 주소

    private String jibunAddress;   // 지번 주소

    private Double latitude;       // 위도

    private Double longitude;      // 경도

    private Integer radius;        // 출퇴근 인증 반경(미터)

    private Integer storeStandardHourWage; // 매장 기준 시급

}