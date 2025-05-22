
package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 위치 검증 서비스
 * 사용자의 위치가 매장의 허용 반경 내에 있는지 검증하는 기능을 제공합니다.
 */
@Service
@RequiredArgsConstructor
public class LocationVerificationService {

    private final StoreRepository storeRepository;

    /**
     * 사용자가 매장 반경 내에 있는지 검증
     *
     * @param storeId       매장 ID
     * @param userLatitude  사용자 위도
     * @param userLongitude 사용자 경도
     * @return 매장 반경 내 위치 여부
     * @throws EntityNotFoundException 매장을 찾을 수 없는 경우
     */
    @Transactional(readOnly = true)
    public boolean verifyUserInStore(Long storeId, Double userLatitude, Double userLongitude) {
        if (userLatitude == null || userLongitude == null) {
            return false;
        }

        // 매장 정보 조회
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("Store", storeId));

        // Store 엔티티의 isUserInRadius 메서드 활용
        return store.isUserInRadius(userLatitude, userLongitude);
    }
}