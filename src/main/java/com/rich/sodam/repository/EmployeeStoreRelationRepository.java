package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import org.springframework.data.jpa.repository.JpaRepository;

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
}