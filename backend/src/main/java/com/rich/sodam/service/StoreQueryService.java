package com.rich.sodam.service;

import com.rich.sodam.config.crypto.PiiSearchHashSupport;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 매장 조회 및 통계 전용 서비스
 * 컨트롤러에서 직접 Repository를 호출하지 않고 서비스 계층을 통해 접근하도록 분리합니다.
 *
 * <p>WP-07: 전역 write 트랜잭션 advisor에만 기대던 경계를 명시했다 — 이 클래스는 전부 조회이므로
 * readOnly=true(과거엔 advisor가 write 트랜잭션으로 감쌌으나, 실제로는 쓰기가 없어 관찰 가능한
 * 차이는 없다).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreQueryService {

    private final StoreRepository storeRepository;

    // ========= Soft Delete 관련 =========
    public List<Store> findAllActive() {
        return storeRepository.findAllActive();
    }

    public Optional<Store> findActiveById(Long id) {
        return storeRepository.findActiveById(id)
                .map(store -> {
                    // 응답에 활성 직원 수 포함 (FE 홈/매장상세 "직원 N명" 표기용)
                    store.setEmployeeCount(storeRepository.countActiveEmployeesByStoreId(id));
                    return store;
                });
    }

    public Optional<Store> findActiveByBusinessNumber(String businessNumber) {
        return storeRepository.findActiveByBusinessNumberSearchHash(
                PiiSearchHashSupport.hashBusinessNumber(businessNumber));
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
