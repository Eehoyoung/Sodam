package com.rich.sodam.domain;

import com.rich.sodam.util.GeoUtils;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * 매장 정보를 나타내는 엔티티 클래스
 * 매장의 기본 정보, 위치 정보, 시급 정보 등을 관리합니다.
 */
@Entity
@Table(name = "store", indexes = {
        @Index(name = "idx_store_business_number", columnList = "businessNumber"),
        @Index(name = "idx_store_code", columnList = "storeCode"),
        @Index(name = "idx_store_name", columnList = "storeName"),
        @Index(name = "idx_store_location", columnList = "latitude, longitude"),
        @Index(name = "idx_store_created_at", columnList = "createdAt"),
        @Index(name = "idx_store_updated_at", columnList = "updatedAt"),
        @Index(name = "idx_store_is_deleted", columnList = "is_deleted"),
        @Index(name = "idx_store_deleted_at", columnList = "deleted_at")
})
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
    private Integer radius;  // 출퇴근 인증 반경(미터)

    @Column(nullable = false)
    private Integer storeStandardHourWage; // 매장 기준 시급

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 운영시간 정보
    @Embedded
    private OperatingHours operatingHours;

    // Soft Delete 관련 필드
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    /**
     * 매장 생성자
     *
     * @param storeName             매장 이름
     * @param businessNumber        사업자등록번호
     * @param storePhoneNumber      매장 전화번호
     * @param businessType          사업 유형
     * @param storeStandardHourWage 기본 시급
     * @param defaultRadius         기본 반경 (AppProperties에서 주입)
     */
    public Store(String storeName, String businessNumber, String storePhoneNumber,
                 String businessType, Integer storeStandardHourWage, Integer defaultRadius) {
        validateBusinessNumber(businessNumber);
        validateStandardWage(storeStandardHourWage);

        this.storeName = storeName;
        this.businessNumber = businessNumber;
        this.storePhoneNumber = storePhoneNumber;
        this.businessType = businessType;
        this.storeCode = generateStoreCode();
        this.storeStandardHourWage = storeStandardHourWage;
        this.radius = defaultRadius != null ? defaultRadius : 100; // 설정값 사용, null이면 기본값
        this.operatingHours = OperatingHours.createDefault(); // 기본 운영시간 설정
        this.isDeleted = false;
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

        // 개별 setter 메서드들을 활용하여 일관성 있는 업데이트 처리
        setLatitude(latitude);
        setLongitude(longitude);
        setFullAddress(fullAddress);
        if (radius != null) {
            setRadius(radius);
        }
    }

    /**
     * 매장 도로명/지번 주소 설정
     *
     * @param roadAddress  도로명 주소
     * @param jibunAddress 지번 주소
     */
    public void setAddressDetails(String roadAddress, String jibunAddress) {
        // 개별 setter 메서드들을 활용하여 일관성 있는 업데이트 처리
        setRoadAddress(roadAddress);
        setJibunAddress(jibunAddress);
    }

    /**
     * 매장 기본 시급 업데이트
     *
     * @param standardHourlyWage 기본 시급
     */
    public void updateStandardWage(Integer standardHourlyWage) {
        // 개별 setter 메서드를 활용하여 일관성 있는 업데이트 처리
        setStoreStandardHourWage(standardHourlyWage);
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
        return "ST" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
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

    // 필요한 setter 메서드들 (캡슐화를 위해 개별적으로 제공)
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
        this.updatedAt = LocalDateTime.now();
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
        this.updatedAt = LocalDateTime.now();
    }

    public void setFullAddress(String fullAddress) {
        this.fullAddress = fullAddress;
        this.updatedAt = LocalDateTime.now();
    }

    public void setRoadAddress(String roadAddress) {
        this.roadAddress = roadAddress;
        this.updatedAt = LocalDateTime.now();
    }

    public void setJibunAddress(String jibunAddress) {
        this.jibunAddress = jibunAddress;
        this.updatedAt = LocalDateTime.now();
    }

    public void setRadius(Integer radius) {
        if (radius != null && radius <= 0) {
            throw new IllegalArgumentException("반경은 양수여야 합니다.");
        }
        this.radius = radius;
        this.updatedAt = LocalDateTime.now();
    }

    public void setStoreStandardHourWage(Integer storeStandardHourWage) {
        validateStandardWage(storeStandardHourWage);
        this.storeStandardHourWage = storeStandardHourWage;
        this.updatedAt = LocalDateTime.now();
    }

    // ==================== 운영시간 관련 메서드 ====================

    /**
     * 매장 운영시간 업데이트
     *
     * @param newOperatingHours 새로운 운영시간 정보
     */
    public void updateOperatingHours(OperatingHours newOperatingHours) {
        if (newOperatingHours == null) {
            throw new IllegalArgumentException("운영시간 정보는 필수입니다.");
        }

        newOperatingHours.validateOperatingHours();
        this.operatingHours = newOperatingHours;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 현재 시점에 매장이 운영 중인지 확인
     *
     * @return 운영 중이면 true, 아니면 false
     */
    public boolean isOpenNow() {
        if (isDeleted || operatingHours == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return isOpenAt(now);
    }

    /**
     * 특정 시점에 매장이 운영 중인지 확인
     *
     * @param dateTime 확인할 시점
     * @return 운영 중이면 true, 아니면 false
     */
    public boolean isOpenAt(LocalDateTime dateTime) {
        if (isDeleted || operatingHours == null || dateTime == null) {
            return false;
        }

        DayOfWeek dayOfWeek = dateTime.getDayOfWeek();
        LocalTime time = dateTime.toLocalTime();

        // 해당 요일이 휴무인지 확인
        if (!operatingHours.isOpenOn(dayOfWeek)) {
            return false;
        }

        LocalTime openTime = operatingHours.getOpenTime(dayOfWeek);
        LocalTime closeTime = operatingHours.getCloseTime(dayOfWeek);

        if (openTime == null || closeTime == null) {
            return false;
        }

        // 시간 범위 내에 있는지 확인
        return !time.isBefore(openTime) && !time.isAfter(closeTime);
    }

    // ==================== Soft Delete 관련 메서드 ====================

    /**
     * 매장을 논리적으로 삭제 (Soft Delete)
     */
    public void softDelete() {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 삭제된 매장을 복구
     */
    public void restore() {
        this.isDeleted = false;
        this.deletedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 매장이 활성 상태인지 확인
     *
     * @return 활성 상태면 true, 삭제된 상태면 false
     */
    public boolean isActive() {
        return !Boolean.TRUE.equals(isDeleted);
    }

    /**
     * 매장이 삭제된 상태인지 확인
     *
     * @return 삭제된 상태면 true, 활성 상태면 false
     */
    public boolean isDeleted() {
        return Boolean.TRUE.equals(isDeleted);
    }

    // ==================== 유틸리티 메서드 ====================

    /**
     * 매장 정보가 완전히 설정되었는지 확인
     *
     * @return 필수 정보가 모두 설정되었으면 true
     */
    public boolean isFullyConfigured() {
        return hasLocationSet() &&
                operatingHours != null &&
                storeStandardHourWage != null &&
                storeStandardHourWage > 0;
    }

    /**
     * 매장의 기본 정보를 문자열로 반환
     *
     * @return 매장 기본 정보 문자열
     */
    @Override
    public String toString() {
        return String.format("Store{id=%d, name='%s', code='%s', active=%s}",
                id, storeName, storeCode, isActive());
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
