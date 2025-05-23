package com.rich.sodam.domain;

import com.rich.sodam.util.GeoUtils;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Random;

/**
 * 매장 정보를 나타내는 엔티티 클래스
 * 매장의 기본 정보, 위치 정보, 시급 정보 등을 관리합니다.
 */
@Entity
@Table(name = "store")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "store_id")
    private Long id;

    @Column(nullable = false)
    private String storeName;

    @Column(nullable = false, unique = true)
    private String businessNumber; // 사업자등록번호

    @Column(nullable = false)
    private String storePhoneNumber;

    @Column(nullable = false)
    private String businessType;

    @Column(nullable = false, unique = true)
    private String storeCode;

    // 위치 관련 필드
    private String fullAddress;    // 전체 주소
    private String roadAddress;    // 도로명 주소
    private String jibunAddress;   // 지번 주소
    private Double latitude;       // 위도
    private Double longitude;      // 경도

    @Column(nullable = false)
    private Integer radius = 100;  // 출퇴근 인증 반경(미터)

    @Column(nullable = false)
    private Integer storeStandardHourWage; // 매장 기준 시급

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /**
     * 매장 생성자
     *
     * @param storeName             매장 이름
     * @param businessNumber        사업자등록번호
     * @param storePhoneNumber      매장 전화번호
     * @param businessType          사업 유형
     * @param storeStandardHourWage 기본 시급
     */
    public Store(String storeName, String businessNumber, String storePhoneNumber,
                 String businessType, Integer storeStandardHourWage) {
        validateBusinessNumber(businessNumber);
        validateStandardWage(storeStandardHourWage);

        this.storeName = storeName;
        this.businessNumber = businessNumber;
        this.storePhoneNumber = storePhoneNumber;
        this.businessType = businessType;
        this.storeCode = generateStoreCode();
        this.storeStandardHourWage = storeStandardHourWage;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 매장 위치 정보 업데이트
     *
     * @param latitude    위도
     * @param longitude   경도
     * @param fullAddress 전체 주소
     * @param radius      인증 반경
     */
    public void updateLocation(Double latitude, Double longitude, String fullAddress, Integer radius) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("위도와 경도는 필수 입력값입니다.");
        }
        if (radius != null && radius <= 0) {
            throw new IllegalArgumentException("반경은 양수여야 합니다.");
        }

        this.latitude = latitude;
        this.longitude = longitude;
        this.fullAddress = fullAddress;
        if (radius != null) {
            this.radius = radius;
        }
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 매장 도로명/지번 주소 설정
     *
     * @param roadAddress  도로명 주소
     * @param jibunAddress 지번 주소
     */
    public void setAddressDetails(String roadAddress, String jibunAddress) {
        this.roadAddress = roadAddress;
        this.jibunAddress = jibunAddress;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 매장 기본 시급 업데이트
     *
     * @param standardHourlyWage 기본 시급
     */
    public void updateStandardWage(Integer standardHourlyWage) {
        validateStandardWage(standardHourlyWage);
        this.storeStandardHourWage = standardHourlyWage;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 매장 정보 업데이트
     *
     * @param storeName        매장 이름
     * @param storePhoneNumber 매장 전화번호
     * @param businessType     사업 유형
     */
    public void updateStoreInfo(String storeName, String storePhoneNumber, String businessType) {
        if (storeName != null && !storeName.trim().isEmpty()) {
            this.storeName = storeName;
        }
        if (storePhoneNumber != null && !storePhoneNumber.trim().isEmpty()) {
            this.storePhoneNumber = storePhoneNumber;
        }
        if (businessType != null && !businessType.trim().isEmpty()) {
            this.businessType = businessType;
        }
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 위치 정보가 설정되었는지 확인
     *
     * @return 위치 정보 설정 여부
     */
    public boolean hasLocationSet() {
        return latitude != null && longitude != null;
    }

    /**
     * 사용자가 매장 반경 내에 있는지 확인
     *
     * @param userLatitude  사용자 위도
     * @param userLongitude 사용자 경도
     * @return 매장 반경 내 위치 여부
     */
    public boolean isUserInRadius(Double userLatitude, Double userLongitude) {
        if (!hasLocationSet() || userLatitude == null || userLongitude == null) {
            return false;
        }

        // GeoUtils 사용으로 변경
        return GeoUtils.isPointInRadius(latitude, longitude, userLatitude, userLongitude, radius);
    }


    // 매장 코드 생성 메서드
    private String generateStoreCode() {
        return "ST" + System.currentTimeMillis() + (new Random().nextInt(900) + 100);
    }

    // 두 지점 간 거리 계산 (Haversine 공식)
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // 지구 반지름 (km)

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c * 1000; // 미터로 변환
    }

    private void validateBusinessNumber(String businessNumber) {
        if (businessNumber == null || !businessNumber.matches("\\d{10}")) {
            throw new IllegalArgumentException("사업자등록번호는 10자리 숫자여야 합니다.");
        }
    }

    private void validateStandardWage(Integer wage) {
        if (wage == null || wage <= 0) {
            throw new IllegalArgumentException("시급은 양수여야 합니다.");
        }
    }
}


/*
    Haversine 공식

    - 지구상의 두 지점 간의 최단 거리를 계산하는 데 사용되는 공식입니다. 지구가 구형이라고 가정하고, 두 점의 위도와 경도를 이용하여 대원 거리를 구하는 방식

    공식

    d = 2r \cdot \arcsin \left( \sqrt{\sin2\left(\frac{\Delta \lambda}{2}\right)} \right)

    - ( d ) : 두 지점 간의 거리
    - ( r ) : 지구의 반지름 (약 6371km)
    - ( \varphi_1, \varphi_2 ) : 두 지점의 위도 (라디안 단위)
    - ( \lambda_1, \lambda_2 ) : 두 지점의 경도 (라디안 단위)
    - ( \Delta \varphi = \varphi_2 - \varphi_1 )
    - ( \Delta \lambda = \lambda_2 - \lambda_1 )

    사용이유

    Haversine 공식을 사용하는 주된 이유는 정확하고 효율적인 거리 계산에 있습니다.
    출퇴근 기록 서비스의 경우 사용자가 실제 근무지 근처에 있는지 확인하는 것이 매우 중요한데 이를 위해서는 실시간 GPS 좌표들 사이의 거리를 빠르고 정밀하게 측정할 수 있어야 합니다.
    - 정확도: Haversine 공식은 위도와 경도를 기반으로 지구상의 두 지점 사이의 대원 거리를 계산합니다.
    비록 지구를 완벽한 구로 가정하지만 짧은 거리(예: 출퇴근 시의 위치 확인)에서는 오차가 거의 없으며 근무지 확인에 충분한 정확도를 제공합니다.
    - 계산 효율성: 이 공식은 비교적 단순한 삼각함수 연산만 필요로 하기 때문에 서버나 모바일 장치 상에서 실시간으로 빠른 계산이 가능합니다. 이는 대량의 위치 데이터를 처리해야 하는 시스템에서 매우 큰 장점입니다.
    - 신뢰성: 전 세계적으로 많은 위치 기반 서비스에서 입증된 방법으로 사용되므로 Haversine 공식은 이미 검증된 알고리즘입니다.
    이를 이용하면 사용자가 실제 근무지에 근접해 있을 경우에만 출퇴근 기록을 허용할 수 있어 부정 사용을 효과적으로 방지할 수 있습니다.


 */