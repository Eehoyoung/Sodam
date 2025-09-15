package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * LocationVerificationService 테스트 클래스
 * 위치 검증 서비스의 핵심 비즈니스 로직을 검증합니다.
 * <p>
 * 주의: Mockito 사용 금지 - 실제 컴포넌트를 사용한 통합 테스트로 작성
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LocationVerificationServiceTest {

    @Autowired
    private LocationVerificationService locationVerificationService;

    @Autowired
    private StoreRepository storeRepository;

    private Store testStore;

    @BeforeEach
    void setUp() {
        System.out.println("[DEBUG_LOG] LocationVerificationServiceTest 테스트 데이터 초기화 시작");

        // 테스트 매장 생성 (서울 강남구 좌표, 반경 100미터)
        testStore = new Store("위치검증테스트매장", "7777777777", "02-7777-7777", "카페", 20000, 100);
        testStore.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 999", 100);
        testStore = storeRepository.save(testStore);
        System.out.println("[DEBUG_LOG] 테스트 매장 생성 완료 - ID: " + testStore.getId() +
                ", 위치: (" + testStore.getLatitude() + ", " + testStore.getLongitude() +
                "), 반경: " + testStore.getRadius() + "m");
    }

    @Test
    @DisplayName("매장 반경 내 위치 검증 - 성공")
    void verifyUserInStore_WithinRadius_Success() {
        System.out.println("[DEBUG_LOG] 매장 반경 내 위치 검증 테스트 시작");

        // Given - 매장과 동일한 위치 (반경 내)
        Double userLatitude = 37.5665;
        Double userLongitude = 126.9780;

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isTrue();

        System.out.println("[DEBUG_LOG] 매장 반경 내 위치 검증 성공 - 결과: " + result);
    }

    @Test
    @DisplayName("매장 반경 내 위치 검증 (근접한 위치) - 성공")
    void verifyUserInStore_NearbyLocation_Success() {
        System.out.println("[DEBUG_LOG] 매장 반경 내 근접한 위치 검증 테스트 시작");

        // Given - 매장에서 약 50미터 떨어진 위치 (반경 100미터 내)
        Double userLatitude = 37.5660; // 약간 남쪽
        Double userLongitude = 126.9785; // 약간 동쪽

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isTrue();

        System.out.println("[DEBUG_LOG] 매장 반경 내 근접한 위치 검증 성공 - 결과: " + result);
    }

    @Test
    @DisplayName("매장 반경 밖 위치 검증 - 실패")
    void verifyUserInStore_OutsideRadius_Failure() {
        System.out.println("[DEBUG_LOG] 매장 반경 밖 위치 검증 테스트 시작");

        // Given - 매장에서 멀리 떨어진 위치 (반경 밖)
        Double userLatitude = 37.5000; // 약 7km 남쪽
        Double userLongitude = 126.9000; // 약 6km 서쪽

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isFalse();

        System.out.println("[DEBUG_LOG] 매장 반경 밖 위치 검증 실패 - 결과: " + result);
    }

    @Test
    @DisplayName("null 위도로 위치 검증 - 실패")
    void verifyUserInStore_NullLatitude_Failure() {
        System.out.println("[DEBUG_LOG] null 위도로 위치 검증 테스트 시작");

        // Given
        Double userLatitude = null;
        Double userLongitude = 126.9780;

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isFalse();

        System.out.println("[DEBUG_LOG] null 위도로 위치 검증 실패 - 결과: " + result);
    }

    @Test
    @DisplayName("null 경도로 위치 검증 - 실패")
    void verifyUserInStore_NullLongitude_Failure() {
        System.out.println("[DEBUG_LOG] null 경도로 위치 검증 테스트 시작");

        // Given
        Double userLatitude = 37.5665;
        Double userLongitude = null;

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isFalse();

        System.out.println("[DEBUG_LOG] null 경도로 위치 검증 실패 - 결과: " + result);
    }

    @Test
    @DisplayName("존재하지 않는 매장으로 위치 검증 - 예외 발생")
    void verifyUserInStore_NonExistentStore_ThrowsException() {
        System.out.println("[DEBUG_LOG] 존재하지 않는 매장으로 위치 검증 테스트 시작");

        // Given
        Long nonExistentStoreId = 99999L;
        Double userLatitude = 37.5665;
        Double userLongitude = 126.9780;

        // When & Then
        assertThatThrownBy(() -> locationVerificationService.verifyUserInStore(
                nonExistentStoreId, userLatitude, userLongitude))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Store");

        System.out.println("[DEBUG_LOG] 존재하지 않는 매장으로 위치 검증 예외 발생 테스트 완료");
    }

    @Test
    @DisplayName("매장 위치 정보가 없는 경우 - 실패")
    void verifyUserInStore_StoreWithoutLocation_Failure() {
        System.out.println("[DEBUG_LOG] 매장 위치 정보가 없는 경우 테스트 시작");

        // Given - 위치 정보가 없는 매장 생성
        Store storeWithoutLocation = new Store("위치없는매장", "8888888888", "02-8888-8888", "편의점", 15000, 100);
        storeWithoutLocation = storeRepository.save(storeWithoutLocation);

        Double userLatitude = 37.5665;
        Double userLongitude = 126.9780;

        // When
        boolean result = locationVerificationService.verifyUserInStore(
                storeWithoutLocation.getId(), userLatitude, userLongitude);

        // Then
        assertThat(result).isFalse();

        System.out.println("[DEBUG_LOG] 매장 위치 정보가 없는 경우 실패 - 결과: " + result);
    }

    @Test
    @DisplayName("경계선 위치 검증 - 반경 경계에서의 동작 확인")
    void verifyUserInStore_BoundaryLocation_Test() {
        System.out.println("[DEBUG_LOG] 경계선 위치 검증 테스트 시작");

        // Given - 반경 100미터 경계 근처 위치
        // 약 90미터 떨어진 위치 (반경 내)
        Double nearBoundaryLatitude = 37.5657; // 약간 남쪽
        Double nearBoundaryLongitude = 126.9780;

        // When
        boolean nearResult = locationVerificationService.verifyUserInStore(
                testStore.getId(), nearBoundaryLatitude, nearBoundaryLongitude);

        // Then
        assertThat(nearResult).isTrue(); // 반경 내이므로 true

        System.out.println("[DEBUG_LOG] 경계선 위치 검증 완료 - 90m 거리 결과: " + nearResult);
    }

    @Test
    @DisplayName("다양한 반경 설정 테스트")
    void verifyUserInStore_DifferentRadius_Test() {
        System.out.println("[DEBUG_LOG] 다양한 반경 설정 테스트 시작");

        // Given - 반경 50미터인 매장 생성
        Store smallRadiusStore = new Store("작은반경매장", "9999999999", "02-9999-9999", "베이커리", 18000, 100);
        smallRadiusStore.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 111", 50);
        smallRadiusStore = storeRepository.save(smallRadiusStore);

        // 약 70미터 떨어진 위치
        Double userLatitude = 37.5658;
        Double userLongitude = 126.9780;

        // When
        boolean resultSmallRadius = locationVerificationService.verifyUserInStore(
                smallRadiusStore.getId(), userLatitude, userLongitude);
        boolean resultLargeRadius = locationVerificationService.verifyUserInStore(
                testStore.getId(), userLatitude, userLongitude); // 반경 100미터

        // Then
        assertThat(resultSmallRadius).isFalse(); // 반경 50미터 밖
        assertThat(resultLargeRadius).isTrue();  // 반경 100미터 내

        System.out.println("[DEBUG_LOG] 다양한 반경 설정 테스트 완료 - 50m 반경: " + resultSmallRadius +
                ", 100m 반경: " + resultLargeRadius);
    }
}
