package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Random;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String storeName;

    private String businessNumber; //사업자등록번호

    private String storePhoneNumber;

    private String businessType;

    private String storeCode;

    public Store(String storeName, String businessNumber, String storePhoneNumber, String businessType) {
        this.storeName = storeName;
        this.businessNumber = businessNumber;
        this.storePhoneNumber = storePhoneNumber;
        this.businessType = businessType;
        this.storeCode = generateStoreCode(); // 시스템에서 자동 생성
    }

    // 매장 코드 생성 메서드
    private String generateStoreCode() {
        return "ST" + System.currentTimeMillis() +
                (new Random().nextInt(900) + 100);
    }
}