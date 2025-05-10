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

}