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

    // 위치 관련 필드 추가
    private String fullAddress;    // 전체 주소

    private String roadAddress;    // 도로명 주소

    private String jibunAddress;   // 지번 주소

    private Double latitude;       // 위도

    private Double longitude;      // 경도

    private Integer radius;        // 출퇴근 인증 반경(미터)

    public Store(String storeName, String businessNumber, String storePhoneNumber, String businessType) {
        this.storeName = storeName;
        this.businessNumber = businessNumber;
        this.storePhoneNumber = storePhoneNumber;
        this.businessType = businessType;
        this.storeCode = generateStoreCode(); // 시스템에서 자동 생성
        this.radius = 100; // 기본 반경 설정
    }

    // 매장 코드 생성 메서드
    private String generateStoreCode() {
        return "ST" + System.currentTimeMillis() +
                (new Random().nextInt(900) + 100);
    }
}