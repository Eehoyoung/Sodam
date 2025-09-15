package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 매장 조회 및 통계 전용 서비스
 * 컨트롤러에서 직접 Repository를 호출하지 않고 서비스 계층을 통해 접근하도록 분리합니다.
 */
@Service
@RequiredArgsConstructor
public class StoreQueryService {

    private final StoreRepository storeRepository;

    // ========= Soft Delete 관련 =========
    public List<Store> findAllActive() {
        return storeRepository.findAllActive();
    }

    public Optional<Store> findActiveById(Long id) {
        return storeRepository.findActiveById(id);
    }

    public Optional<Store> findActiveByBusinessNumber(String businessNumber) {
        return storeRepository.findActiveByBusinessNumber(businessNumber);
    }

    public List<Store> findAllDeleted() {
        return storeRepository.findAllDeleted();
    }

    public Optional<Store> findDeletedById(Long id) {
        return storeRepository.findDeletedById(id);
    }

    public List<Store> findActiveStoresByMaster(Long userId) {
        return storeRepository.findActiveStoresByMaster(userId);
    }

    public List<Store> findActiveStoresByEmployee(Long userId) {
        return storeRepository.findActiveStoresByEmployee(userId);
    }

    // ========= 권한 확인 =========
    public boolean isMasterOfStore(Long storeId, Long userId) {
        return storeRepository.existsByIdAndMasterUserId(storeId, userId);
    }

    public boolean isEmployeeOfStore(Long storeId, Long userId) {
        return storeRepository.existsByIdAndEmployeeUserId(storeId, userId);
    }

    // ========= 통계 =========
    public int countActiveEmployees(Long storeId) {
        return storeRepository.countActiveEmployeesByStoreId(storeId);
    }

    public int countAttendance(Long storeId) {
        return storeRepository.countAttendanceRecordsByStoreId(storeId);
    }

    public int countPayroll(Long storeId) {
        return storeRepository.countPayrollRecordsByStoreId(storeId);
    }

    public int countUnpaidPayroll(Long storeId) {
        return storeRepository.countUnpaidPayrollsByStoreId(storeId);
    }

    public Optional<LocalDateTime> findLastActivity(Long storeId) {
        return storeRepository.findLastActivityDateByStoreId(storeId);
    }

    // ========= 검색 =========
    public List<Store> searchActiveByName(String storeName) {
        return storeRepository.findActiveStoresByNameContaining(storeName);
    }

    public List<Store> findActiveStoresCreatedBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return storeRepository.findActiveStoresByCreatedAtBetween(startDate, endDate);
    }

    public List<Store> findDeletedStoresDeletedBetween(LocalDateTime startDate, LocalDateTime endDate) {
        return storeRepository.findDeletedStoresByDeletedAtBetween(startDate, endDate);
    }
}
