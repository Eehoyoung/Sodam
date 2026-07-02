package com.rich.sodam.repository;

import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.type.BonusPaymentTiming;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PayrollBonusRepository extends JpaRepository<PayrollBonus, Long> {

    /** 급여 정산 시 아직 합산되지 않은 급여합산형 보너스를 기간으로 조회(멱등 합산의 기준). */
    List<PayrollBonus> findByEmployeeIdAndStoreIdAndPaymentTimingAndIncludedInPayrollIdIsNullAndBonusDateBetween(
            Long employeeId, Long storeId, BonusPaymentTiming paymentTiming, LocalDate from, LocalDate to);

    /** 사장: 특정 직원에게 준 보너스 이력(최신순). */
    List<PayrollBonus> findByEmployeeIdAndStoreIdOrderByBonusDateDesc(Long employeeId, Long storeId);

    /** 직원 본인의 보너스 이력(최신순). */
    List<PayrollBonus> findByEmployeeIdOrderByBonusDateDesc(Long employeeId);
}
