package com.rich.sodam.service;

import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
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
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollRepository payrollRepository;

    @Autowired
    public MasterProfileService(MasterProfileRepository masterProfileRepository,
                                UserRepository userRepository,
                                MasterStoreRelationRepository masterStoreRelationRepository,
                                StoreRepository storeRepository,
                                TimeOffService timeOffService,
                                EmployeeStoreRelationRepository employeeStoreRelationRepository,
                                PayrollRepository payrollRepository) {
        this.masterProfileRepository = masterProfileRepository;
        this.userRepository = userRepository;
        this.masterStoreRelationRepository = masterStoreRelationRepository;
        this.storeRepository = storeRepository;
        this.timeOffService = timeOffService;
        this.employeeStoreRelationRepository = employeeStoreRelationRepository;
        this.payrollRepository = payrollRepository;
    }

    /** 매장 해당 월 확정 인건비(급여 grossWage 합, 원). */
    private long laborCostOf(Long storeId, YearMonth month) {
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        return payrollRepository.findByStoreIdAndPeriod(storeId, from, to).stream()
                .mapToLong(p -> p.getGrossWage() == null ? 0L : p.getGrossWage())
                .sum();
    }

    /** 매장 활성 직원 수. */
    private int activeEmployeeCountOf(Store store) {
        return (int) employeeStoreRelationRepository.countByStoreAndIsActiveTrue(store);
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
    @Transactional(readOnly = true)
    public Map<String, Object> getStoreStats(Long storeId, String month) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new NoSuchElementException("매장을 찾을 수 없습니다."));

        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        List<EmployeeStoreRelation> active = employeeStoreRelationRepository.findByStoreAndIsActiveTrue(store);
        int employeeCount = active.size();
        long laborCost = laborCostOf(storeId, ym);
        int averageHourlyWage = active.isEmpty() ? 0
                : (int) Math.round(active.stream()
                        .mapToInt(EmployeeStoreRelation::getAppliedHourlyWage)
                        .average().orElse(0));

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEmployees", employeeCount);
        stats.put("totalLaborCost", laborCost);
        stats.put("averageHourlyWage", averageHourlyWage);
        stats.put("pendingTimeOffRequests", 0); // 매장 단위 집계는 미지원 — 마스터 통합 통계에서 제공
        stats.put("month", ym.toString());

        return stats;
    }

    /**
     * 사장이 소유한 모든 매장의 통합 통계 조회.
     *
     * 매장 목록을 아직 조회하지 않은 호출부(예: /api/master/stats)를 위한 편의 오버로드 —
     * 내부에서 {@link #getStoresByMaster(Long)}로 조회한 뒤 {@link #getCombinedStats(Long, List)}에 위임한다.
     * 이미 매장 목록을 가진 호출부(예: /api/master/mypage)는 중복 조회를 피하기 위해
     * {@link #getCombinedStats(Long, List)}를 직접 사용할 것.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCombinedStats(Long masterId) {
        List<Store> stores = getStoresByMaster(masterId);
        return getCombinedStats(masterId, stores);
    }

    /**
     * 사장이 소유한 모든 매장의 통합 통계 조회 — 매장 목록을 매개변수로 받아 중복 조회를 방지한다.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCombinedStats(Long masterId, List<Store> stores) {
        YearMonth thisMonth = YearMonth.now();

        int totalStores = stores.size();
        int totalEmployees = stores.stream().mapToInt(this::activeEmployeeCountOf).sum();
        long totalLaborCost = stores.stream()
                .mapToLong(s -> laborCostOf(s.getId(), thisMonth)).sum();
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
        Map<String, Object> combinedStats = getCombinedStats(masterId, stores);
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
