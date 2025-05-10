package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LocationVerificationService {

    private final StoreRepository storeRepository;

    public boolean verifyUserInStore(Long storeId, Double userLatitude, Double userLongitude) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        // 매장의 위치 정보가 없는 경우
        if (store.getLatitude() == null || store.getLongitude() == null) {
            return false;
        }

        // 거리 계산 (Haversine 공식 사용)
        double distance = calculateDistance(
                store.getLatitude(), store.getLongitude(),
                userLatitude, userLongitude
        );

        // 매장 반경 내에 있는지 확인
        int radius = store.getRadius() != null ? store.getRadius() : 100;
        return distance <= radius;
    }

    // Haversine 공식을 사용한 두 좌표 간 거리 계산 (미터 단위)
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