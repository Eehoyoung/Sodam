package com.rich.sodam.repository;

import com.rich.sodam.domain.Payroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * 급여 명세서 레포지토리
 */
public interface PayrollRepository extends JpaRepository<Payroll, Long> {

    /**
     * 직원 ID로 급여 내역 조회
     */
    List<Payroll> findByEmployee_IdOrderByEndDateDesc(Long employeeId);

    /**
     * 여러 직원 ID의 급여 내역을 한 번에 조회 (N+1 방지). 최신순 정렬 후 자바에서
     * 직원 ID별로 그룹핑해 각자의 첫 번째(최신) 레코드만 사용할 것.
     */
    List<Payroll> findByEmployee_IdInOrderByEndDateDesc(List<Long> employeeIds);

    /**
     * 직원 ID와 기간으로 급여 내역 조회
     */
    @Query("SELECT p FROM Payroll p WHERE p.employee.id = :employeeId " +
            "AND (:from IS NULL OR p.endDate >= :from) " +
            "AND (:to IS NULL OR p.startDate <= :to) " +
            "ORDER BY p.endDate DESC")
    List<Payroll> findByEmployeeIdAndPeriod(
            @Param("employeeId") Long employeeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * 매장 ID로 급여 내역 조회
     */
    List<Payroll> findByStore_IdOrderByEndDateDesc(Long storeId);

    /**
     * 매장 ID와 기간으로 급여 내역 조회
     */
    @Query("SELECT p FROM Payroll p WHERE p.store.id = :storeId " +
            "AND (:from IS NULL OR p.endDate >= :from) " +
            "AND (:to IS NULL OR p.startDate <= :to) " +
            "ORDER BY p.endDate DESC")
    List<Payroll> findByStoreIdAndPeriod(
            @Param("storeId") Long storeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}