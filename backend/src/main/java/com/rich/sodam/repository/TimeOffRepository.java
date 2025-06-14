package com.rich.sodam.repository;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.TimeOff;
import com.rich.sodam.domain.type.TimeOffStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TimeOffRepository extends JpaRepository<TimeOff, Long> {

    // 특정 매장의 모든 휴가 신청 조회
    List<TimeOff> findByStore(Store store);

    // 특정 매장의 특정 상태의 휴가 신청 조회
    List<TimeOff> findByStoreAndStatus(Store store, TimeOffStatus status);

    // 특정 직원의 모든 휴가 신청 조회
    List<TimeOff> findByEmployee(EmployeeProfile employee);

    // 특정 직원의 특정 상태의 휴가 신청 조회
    List<TimeOff> findByEmployeeAndStatus(EmployeeProfile employee, TimeOffStatus status);

    // 특정 기간에 겹치는 휴가 신청 조회
    @Query("SELECT t FROM TimeOff t WHERE t.store = :store AND " +
            "((t.startDate <= :endDate AND t.endDate >= :startDate))")
    List<TimeOff> findOverlappingTimeOffs(
            @Param("store") Store store,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // 특정 사장이 소유한 모든 매장의 대기 중인 휴가 신청 조회
    @Query("SELECT t FROM TimeOff t JOIN t.store s JOIN MasterStoreRelation msr ON s = msr.store " +
            "WHERE msr.masterProfile.id = :masterId AND t.status = 'PENDING'")
    List<TimeOff> findPendingTimeOffsByMasterId(@Param("masterId") Long masterId);

    // 특정 사장이 소유한 모든 매장의 휴가 신청 수 조회
    @Query("SELECT COUNT(t) FROM TimeOff t JOIN t.store s JOIN MasterStoreRelation msr ON s = msr.store " +
            "WHERE msr.masterProfile.id = :masterId AND t.status = :status")
    int countTimeOffsByMasterIdAndStatus(
            @Param("masterId") Long masterId,
            @Param("status") TimeOffStatus status);

    // 특정 매장의 특정 상태의 휴가 신청 수 조회
    @Query("SELECT COUNT(t) FROM TimeOff t WHERE t.store.id = :storeId AND t.status = :status")
    int countTimeOffsByStoreIdAndStatus(
            @Param("storeId") Long storeId,
            @Param("status") TimeOffStatus status);
}
