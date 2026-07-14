package com.rich.sodam.repository;

import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.type.BonusPaymentTiming;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PayrollBonusRepository extends JpaRepository<PayrollBonus, Long> {

    /** 급여 정산 시 아직 합산되지 않은 급여합산형 보너스를 기간으로 조회(멱등 합산의 기준). */
    List<PayrollBonus> findByEmployeeIdAndStoreIdAndPaymentTimingAndIncludedInPayrollIdIsNullAndBonusDateBetween(
            Long employeeId, Long storeId, BonusPaymentTiming paymentTiming, LocalDate from, LocalDate to);

    /**
     * 급여 재계산(recalculate) 대응 — 아직 어떤 급여에도 합산되지 않은 보너스(includedInPayrollId IS NULL)
     * 뿐 아니라, 이번에 재계산 중인 바로 그 급여(payrollId)에 이미 합산 처리된 보너스도 함께 반환한다.
     * 재계산이 기존 Payroll 엔티티를 갱신하는 방식으로 바뀌면서, 첫 계산 때 소비(markConsumed) 처리된
     * 보너스가 두 번째 계산에서는 "이미 소비됨"으로 조회에서 빠져 grossWage 가 줄어드는 회귀를 막는다.
     * payrollId 가 null(신규 급여)이면 IS NULL 조건만 매칭되어 기존 findUnconsumedForPeriod 와 동일하게 동작한다.
     */
    @Query("SELECT b FROM PayrollBonus b WHERE b.employeeId = :employeeId AND b.storeId = :storeId "
            + "AND b.paymentTiming = :paymentTiming AND b.bonusDate BETWEEN :from AND :to "
            + "AND (b.includedInPayrollId IS NULL OR b.includedInPayrollId = :payrollId)")
    List<PayrollBonus> findConsumableForPeriod(
            @Param("employeeId") Long employeeId, @Param("storeId") Long storeId,
            @Param("paymentTiming") BonusPaymentTiming paymentTiming,
            @Param("from") LocalDate from, @Param("to") LocalDate to,
            @Param("payrollId") Long payrollId);

    /** 사장: 특정 직원에게 준 보너스 이력(최신순). */
    List<PayrollBonus> findByEmployeeIdAndStoreIdOrderByBonusDateDesc(Long employeeId, Long storeId);

    List<PayrollBonus> findByEmployeeIdAndStoreIdAndBonusDateBetweenOrderByBonusDateDesc(
            Long employeeId, Long storeId, LocalDate from, LocalDate to);

    /** 직원 본인의 보너스 이력(최신순). */
    List<PayrollBonus> findByEmployeeIdOrderByBonusDateDesc(Long employeeId);
}
