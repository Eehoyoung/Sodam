package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.StoreRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 직원-매장 관계 레포지토리
 * 직원과 매장 간의 관계 데이터에 대한 접근 메소드를 제공합니다.
 */
public interface EmployeeStoreRelationRepository extends JpaRepository<EmployeeStoreRelation, Long> {

    /**
     * 특정 직원과 매장의 관계 조회
     */
    Optional<EmployeeStoreRelation> findByEmployeeProfileAndStore(EmployeeProfile employeeProfile, Store store);

    /**
     * 특정 직원의 모든 매장 관계 조회
     */
    List<EmployeeStoreRelation> findByEmployeeProfile(EmployeeProfile employeeProfile);

    /**
     * 특정 매장의 모든 직원 관계 조회
     */
    List<EmployeeStoreRelation> findByStore(Store store);

    /**
     * 직원 ID와 매장 ID로 관계 조회
     */
    Optional<EmployeeStoreRelation> findByEmployeeProfile_IdAndStore_Id(Long employeeId, Long storeId);

    /**
     * 특정 직원의 모든 관계 조회 (ID 기반)
     */
    List<EmployeeStoreRelation> findByEmployeeProfile_Id(Long employeeId);

    /**
     * 특정 매장의 모든 관계 조회 (ID 기반)
     */
    List<EmployeeStoreRelation> findByStore_Id(Long storeId);

    /**
     * 직원 ID와 매장 ID로 관계 조회 (Fetch Join 사용하여 N+1 문제 해결)
     */
    @Query("SELECT esr FROM EmployeeStoreRelation esr " +
            "JOIN FETCH esr.employeeProfile " +
            "JOIN FETCH esr.store " +
            "WHERE esr.employeeProfile.id = :employeeId AND esr.store.id = :storeId")
    Optional<EmployeeStoreRelation> findByEmployeeIdAndStoreIdWithDetails(
            @Param("employeeId") Long employeeId,
            @Param("storeId") Long storeId);

    /**
     * 활성 상태(isActive=true) 직원 관계만 조회
     */
    List<EmployeeStoreRelation> findByStoreAndIsActiveTrue(Store store);

    /**
     * 활성 상태(isActive=true) 직원 수 — 상시근로자 5인 이상 여부 산정용(Store.applyEmployeeCount).
     */
    long countByStoreAndIsActiveTrue(Store store);

    /**
     * 위와 동일하지만 잠금 읽기({@code FOR UPDATE})로 조회한다(DB_OPTIMIZATION_PLAN.md §2.8(a)).
     * REPEATABLE READ 하에서는 일반 읽기가 트랜잭션 시작 시점의 스냅샷을 보므로, 매장 행을 이미
     * 비관적으로 잠근 뒤라도 이 카운트는 여전히 다른 트랜잭션의 최신 커밋을 놓칠 수 있다 — 잠금 읽기만
     * 스냅샷을 무시하고 항상 최신 커밋 데이터를 본다. {@link StoreManagementServiceImpl#recountEmployeesAndApply}
     * 에서 매장 행 락 이후 이 메서드로 재계산해야 lost update가 완전히 차단된다.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT COUNT(r) FROM EmployeeStoreRelation r WHERE r.store = :store AND r.isActive = true")
    long countByStoreAndIsActiveTrueForUpdate(@Param("store") Store store);

    /**
     * 명시적 JPQL — @MapsId 매핑에서 파생 쿼리가 실패할 때를 대비한 안전 메서드.
     * employee_id / store_id 컬럼 기준 직접 매핑.
     */
    @Query("SELECT esr FROM EmployeeStoreRelation esr " +
            "WHERE esr.employeeProfile.id = :employeeId AND esr.store.id = :storeId")
    Optional<EmployeeStoreRelation> findRelation(
            @Param("employeeId") Long employeeId,
            @Param("storeId") Long storeId);

    /**
     * 직원이 해당 매장에 소속되어 있는지 검증 (StoreAccessGuard 용).
     */
    boolean existsByEmployeeProfile_IdAndStore_Id(Long employeeId, Long storeId);

    /**
     * 직원이 해당 매장에 활성 상태로 소속되어 있는지 검증.
     */
    boolean existsByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(Long employeeId, Long storeId);

    /**
     * 직원 ID와 매장 ID로 활성 관계 조회.
     */
    Optional<EmployeeStoreRelation> findByEmployeeProfile_IdAndStore_IdAndIsActiveTrue(Long employeeId, Long storeId);

    /**
     * 직원의 현재 소속(활성 재직) 관계를 {@code store}까지 fetch join 하여 조회한다
     * (260711_작업통합.md Part 2 §6.2 — 인증채용 "현재 소속" 표시용). 활성 재직이 없으면 빈 리스트
     * → 호출측(Phase 2 서비스)에서 "휴직중"으로 처리. 복수 활성 소속이 이론상 가능하므로
     * 최근 {@code hireDate} 우선으로 정렬해, 호출측이 첫 항목을 채택할 수 있도록 한다.
     */
    @Query("SELECT r FROM EmployeeStoreRelation r " +
            "JOIN FETCH r.store " +
            "WHERE r.employeeProfile.id = :employeeId AND r.isActive = true " +
            "ORDER BY r.hireDate DESC")
    List<EmployeeStoreRelation> findActiveByEmployeeIdWithStore(@Param("employeeId") Long employeeId);

    long countByStore_IdAndStoreRoleAndIsActiveTrue(Long storeId, StoreRole storeRole);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM EmployeeStoreRelation r WHERE r.employeeProfile.id = :employeeId AND r.store.id = :storeId")
    Optional<EmployeeStoreRelation> findRelationForUpdate(@Param("employeeId") Long employeeId,
                                                          @Param("storeId") Long storeId);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM EmployeeStoreRelation r WHERE r.id = :id")
    Optional<EmployeeStoreRelation> findByIdForUpdate(@Param("id") Long id);

    List<EmployeeStoreRelation> findByStore_IdAndStoreRoleAndIsActiveTrue(Long storeId, StoreRole storeRole);
    List<EmployeeStoreRelation> findByEmployeeProfile_IdAndStoreRoleAndIsActiveTrue(Long employeeId, StoreRole storeRole);
}
