package com.rich.sodam.service;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.dto.request.PayrollPolicyUpdateDto;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

/**
 * 급여 정책 관리 서비스
 */
@Service
@RequiredArgsConstructor
public class PayrollPolicyService {

    private final PayrollPolicyRepository payrollPolicyRepository;
    private final StoreRepository storeRepository;

    /**
     * 매장의 급여 정책 조회
     * 정책이 없는 경우 기본 정책 생성
     */
    @Transactional(readOnly = true)
    public PayrollPolicy getPayrollPolicyByStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        return payrollPolicyRepository.findByStore(store)
                .orElseGet(() -> createDefaultPolicy(store));
    }

    /**
     * 매장의 급여 정책 업데이트
     * 정책이 없는 경우 새로 생성
     */
    @Transactional
    public PayrollPolicy updatePayrollPolicy(Long storeId, PayrollPolicyUpdateDto updateDto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new EntityNotFoundException("매장을 찾을 수 없습니다."));

        PayrollPolicy policy = payrollPolicyRepository.findByStore(store)
                .orElseGet(() -> createDefaultPolicy(store));

        // 업데이트할 필드가 null이 아닌 경우에만 업데이트
        if (updateDto.getTaxPolicyType() != null) {
            policy.setTaxPolicyType(updateDto.getTaxPolicyType());
        }

        if (updateDto.getNightWorkRate() != null) {
            policy.setNightWorkRate(updateDto.getNightWorkRate());
        }

        if (updateDto.getNightWorkStartTime() != null) {
            policy.setNightWorkStartTime(updateDto.getNightWorkStartTime());
        }

        if (updateDto.getOvertimeRate() != null) {
            policy.setOvertimeRate(updateDto.getOvertimeRate());
        }

        if (updateDto.getRegularHoursPerDay() != null) {
            policy.setRegularHoursPerDay(updateDto.getRegularHoursPerDay());
        }

        if (updateDto.getWeeklyAllowanceEnabled() != null) {
            policy.setWeeklyAllowanceEnabled(updateDto.getWeeklyAllowanceEnabled());
        }

        return payrollPolicyRepository.save(policy);
    }

    /**
     * 기본 급여 정책 생성
     */
    private PayrollPolicy createDefaultPolicy(Store store) {
        PayrollPolicy policy = new PayrollPolicy();
        policy.setStore(store);
        policy.setTaxPolicyType(TaxPolicyType.INCOME_TAX_3_3); // 기본값: 소득세 3.3%
        policy.setNightWorkRate(1.5); // 기본값: 150%
        policy.setNightWorkStartTime(LocalTime.of(22, 0)); // 기본값: 22시
        policy.setOvertimeRate(1.5); // 기본값: 150%
        policy.setRegularHoursPerDay(8.0); // 기본값: 8시간
        policy.setWeeklyAllowanceEnabled(true); // 기본값: 주휴수당 활성화

        return payrollPolicyRepository.save(policy);
    }
}