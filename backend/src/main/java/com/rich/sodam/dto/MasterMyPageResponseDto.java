package com.rich.sodam.dto;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사장 마이페이지 응답을 위한 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MasterMyPageResponseDto {
    private MasterProfileResponseDto profile;
    private List<StoreDto> stores;
    private CombinedStatsDto combinedStats;
    private List<TimeOffResponseDto> timeOffRequests;

    /**
     * 엔티티들을 MasterMyPageResponseDto로 변환
     */
    public static MasterMyPageResponseDto fromEntities(
            MasterProfile masterProfile,
            List<Store> stores,
            CombinedStatsDto combinedStats,
            List<TimeOff> timeOffRequests) {

        MasterMyPageResponseDto dto = new MasterMyPageResponseDto();
        dto.setProfile(MasterProfileResponseDto.fromEntity(masterProfile));
        dto.setStores(stores.stream().map(StoreDto::fromEntity).collect(Collectors.toList()));
        dto.setCombinedStats(combinedStats);
        dto.setTimeOffRequests(timeOffRequests.stream().map(TimeOffResponseDto::fromEntity).collect(Collectors.toList()));

        return dto;
    }

    /**
     * 매장 정보를 위한 내부 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoreDto {
        private Long id;
        private String storeName;
        private String address;
        private String businessNumber;
        private String storePhoneNumber;
        private String businessType;

        /**
         * Store 엔티티를 StoreDto로 변환
         */
        public static StoreDto fromEntity(Store store) {
            StoreDto dto = new StoreDto();
            dto.setId(store.getId());
            dto.setStoreName(store.getStoreName());
            dto.setAddress(store.getFullAddress());
            dto.setBusinessNumber(store.getBusinessNumber());
            dto.setStorePhoneNumber(store.getStorePhoneNumber());
            dto.setBusinessType(store.getBusinessType());
            return dto;
        }
    }
}
