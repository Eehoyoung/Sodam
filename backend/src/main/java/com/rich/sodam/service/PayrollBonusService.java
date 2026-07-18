package com.rich.sodam.service;

import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.type.BonusPaymentTiming;
import com.rich.sodam.repository.PayrollBonusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 즉시 보너스(비정기 포상금) 관리.
 *
 * <p>정책(도메인 클래스 {@link PayrollBonus} 참고): 근로소득 과세 대상·통상임금 불산입·
 * 최저임금 불산입. 급여합산형(INCLUDED_IN_PAYROLL)만 {@link com.rich.sodam.service.PayrollService}
 * 의 급여 계산 시 자동으로 합산되고, 합산되는 순간 이 서비스가 소비 처리(includedInPayrollId 세팅)해
 * 같은 보너스가 다음 정산에 중복 반영되지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PayrollBonusService {

    private final PayrollBonusRepository payrollBonusRepository;

    @Transactional
    public PayrollBonus create(Long storeId, Long employeeId, Long masterId,
                                LocalDate bonusDate, Integer amount, String reason,
                                BonusPaymentTiming paymentTiming) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("보너스 금액은 0원보다 커야 합니다.");
        }
        if (bonusDate == null) {
            throw new IllegalArgumentException("보너스 지급일은 필수입니다.");
        }
        if (paymentTiming == null) {
            throw new IllegalArgumentException("지급 방식(즉시 현금/급여 합산)을 선택해 주세요.");
        }

        PayrollBonus bonus = new PayrollBonus();
        bonus.setStoreId(storeId);
        bonus.setEmployeeId(employeeId);
        bonus.setBonusDate(bonusDate);
        bonus.setAmount(amount);
        bonus.setReason(reason);
        bonus.setPaymentTiming(paymentTiming);
        bonus.setCreatedByMasterId(masterId);
        return payrollBonusRepository.save(bonus);
    }

    @Transactional(readOnly = true)
    public List<PayrollBonus> findForEmployee(Long employeeId, Long storeId) {
        return payrollBonusRepository.findByEmployeeIdAndStoreIdOrderByBonusDateDesc(employeeId, storeId);
    }

    @Transactional(readOnly = true)
    public List<PayrollBonus> findByEmployee(Long employeeId) {
        return payrollBonusRepository.findByEmployeeIdOrderByBonusDateDesc(employeeId);
    }

    /**
     * 급여 정산 시 호출 — 해당 기간의 미소비 급여합산형 보너스 합계를 반환하고, 즉시 소비 처리한다.
     * PayrollService 가 급여(Payroll) 저장 후 얻은 id를 넘겨줘야 하므로, 합계 조회와 소비 처리를 분리한다.
     *
     * @return 기간 내 미소비 급여합산형 보너스 목록(합계는 호출측에서 계산 후 markConsumed 호출)
     */
    @Transactional(readOnly = true)
    public List<PayrollBonus> findUnconsumedForPeriod(Long employeeId, Long storeId, LocalDate from, LocalDate to) {
        return payrollBonusRepository
                .findByEmployeeIdAndStoreIdAndPaymentTimingAndIncludedInPayrollIdIsNullAndBonusDateBetween(
                        employeeId, storeId, BonusPaymentTiming.INCLUDED_IN_PAYROLL, from, to);
    }

    /**
     * 급여 재계산(recalculate) 전용 — 미소비 보너스뿐 아니라, 재계산 대상인 기존 급여(existingPayrollId)에
     * 이미 합산 소비된 보너스도 함께 반환한다. 신규 계산(existingPayrollId=null)이면 {@link #findUnconsumedForPeriod}
     * 와 동일하게 동작한다. PayrollService 가 기존 Payroll 을 갱신하는 방식으로 재계산할 때, 첫 계산에서 이미
     * markConsumed 된 보너스가 두 번째 계산의 grossWage 에서 조용히 빠지는 회귀를 막기 위함.
     */
    @Transactional(readOnly = true)
    public List<PayrollBonus> findConsumableForPeriod(Long employeeId, Long storeId, LocalDate from, LocalDate to,
                                                        Long existingPayrollId) {
        return payrollBonusRepository.findConsumableForPeriod(
                employeeId, storeId, BonusPaymentTiming.INCLUDED_IN_PAYROLL, from, to, existingPayrollId);
    }

    /** 위 목록을 실제로 이번 급여에 반영했다고 표시(멱등 소비) — 다음 정산에서 다시 잡히지 않는다. */
    @Transactional
    public void markConsumed(List<PayrollBonus> bonuses, Long payrollId) {
        for (PayrollBonus b : bonuses) {
            b.setIncludedInPayrollId(payrollId);
        }
        payrollBonusRepository.saveAll(bonuses);
    }
}
