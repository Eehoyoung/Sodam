package com.rich.sodam.service;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
public class MasterProfileService {

    private final MasterProfileRepository masterProfileRepository;
    private final UserRepository userRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final StoreRepository storeRepository;
    private final TimeOffService timeOffService;

    @Autowired
    public MasterProfileService(MasterProfileRepository masterProfileRepository,
                                UserRepository userRepository,
                                MasterStoreRelationRepository masterStoreRelationRepository,
                                StoreRepository storeRepository,
                                TimeOffService timeOffService) {
        this.masterProfileRepository = masterProfileRepository;
        this.userRepository = userRepository;
        this.masterStoreRelationRepository = masterStoreRelationRepository;
        this.storeRepository = storeRepository;
        this.timeOffService = timeOffService;
    }

    /**
     * 사장 프로필 조회
     */
    public MasterProfile getMasterProfile(Long masterId) {
        return masterProfileRepository.findById(masterId)
                .orElseThrow(() -> new NoSuchElementException("사장 프로필을 찾을 수 없습니다."));
    }

    /**
     * 사장 프로필 업데이트
     */
    @Transactional
    public MasterProfile updateMasterProfile(Long masterId, String businessLicenseNumber) {
        MasterProfile masterProfile = masterProfileRepository.findById(masterId)
                .orElseThrow(() -> new NoSuchElementException("사장 프로필을 찾을 수 없습니다."));

        masterProfile.setBusinessLicenseNumber(businessLicenseNumber);
        return masterProfileRepository.save(masterProfile);
    }

    /**
     * 사장이 소유한 매장 목록 조회
     */
    public List<Store> getStoresByMaster(Long masterId) {
        MasterProfile masterProfile = masterProfileRepository.findById(masterId)
                .orElseThrow(() -> new NoSuchElementException("사장 프로필을 찾을 수 없습니다."));

        List<MasterStoreRelation> relations = masterStoreRelationRepository.findByMasterProfile(masterProfile);
        return relations.stream()
                .map(MasterStoreRelation::getStore)
                .collect(Collectors.toList());
    }

    /**
     * 사장이 소유한 매장 통계 조회
     */
    public Map<String, Object> getStoreStats(Long storeId, String month) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        // 실제 구현에서는 DB에서 통계 데이터를 조회
        // 여기서는 예시 데이터 반환
        int employeeCount = 8; // 예시 데이터, 실제로는 DB에서 조회
        long laborCost = 8500000; // 예시 데이터, 실제로는 DB에서 조회

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEmployees", employeeCount);
        stats.put("totalLaborCost", laborCost);
        stats.put("averageHourlyWage", Math.round(laborCost / (employeeCount * 160)));
        stats.put("pendingTimeOffRequests", 3); // 실제로는 TimeOffService에서 조회
        stats.put("month", month);

        return stats;
    }

    /**
     * 사장이 소유한 모든 매장의 통합 통계 조회
     */
    public Map<String, Object> getCombinedStats(Long masterId) {
        List<Store> stores = getStoresByMaster(masterId);

        int totalStores = stores.size();
        // 실제 구현에서는 DB에서 통계 데이터를 조회
        // 여기서는 예시 데이터 반환
        int totalEmployees = 25; // 예시 데이터, 실제로는 DB에서 조회
        long totalLaborCost = 25000000; // 예시 데이터, 실제로는 DB에서 조회
        int pendingTimeOffRequests = timeOffService.countPendingTimeOffsByMaster(masterId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStores", totalStores);
        stats.put("totalEmployees", totalEmployees);
        stats.put("totalLaborCost", totalLaborCost);
        stats.put("pendingTimeOffRequests", pendingTimeOffRequests);

        return stats;
    }

    /**
     * 사장 정보와 소유 매장 정보를 포함한 마이페이지 데이터 조회
     */
    public Map<String, Object> getMasterMyPageData(Long masterId) {
        User user = userRepository.findById(masterId)
                .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));

        MasterProfile masterProfile = masterProfileRepository.findById(masterId)
                .orElseThrow(() -> new NoSuchElementException("사장 프로필을 찾을 수 없습니다."));

        List<Store> stores = getStoresByMaster(masterId);
        Map<String, Object> combinedStats = getCombinedStats(masterId);
        List<Map<String, Object>> timeOffRequests = timeOffService.getPendingTimeOffsByMaster(masterId).stream()
                .map(this::convertTimeOffToMap)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("profile", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "businessLicenseNumber", masterProfile.getBusinessLicenseNumber()
        ));
        result.put("stores", stores);
        result.put("combinedStats", combinedStats);
        result.put("timeOffRequests", timeOffRequests);

        return result;
    }

    /**
     * TimeOff 객체를 Map으로 변환
     */
    private Map<String, Object> convertTimeOffToMap(com.rich.sodam.domain.TimeOff timeOff) {
        return Map.of(
                "id", timeOff.getId(),
                "employeeId", timeOff.getEmployee().getId(),
                "employeeName", timeOff.getEmployee().getUser().getName(),
                "storeId", timeOff.getStore().getId(),
                "storeName", timeOff.getStore().getStoreName(),
                "startDate", timeOff.getStartDate().toString(),
                "endDate", timeOff.getEndDate().toString(),
                "reason", timeOff.getReason(),
                "status", timeOff.getStatus().toString()
        );
    }
}
