package com.rich.sodam.service;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.dto.request.PayrollPolicyUpdateDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PayrollPolicyServiceTest {

    private final PayrollPolicyRepository payrollPolicyRepository = mock(PayrollPolicyRepository.class);
    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final PayrollPolicyService service = new PayrollPolicyService(payrollPolicyRepository, storeRepository);

    @Test
    void rejectsNightStartBeforeSixAm() {
        Store store = mock(Store.class);
        PayrollPolicy policy = new PayrollPolicy();
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(payrollPolicyRepository.findByStore(store)).thenReturn(Optional.of(policy));

        assertThatThrownBy(() -> service.updatePayrollPolicy(1L, policyUpdate(LocalTime.MIDNIGHT)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo("NIGHT_WORK_START_INVALID");
    }

    @Test
    void rejectsSixAmBecauseItWouldCreateAFullDayNightWindow() {
        Store store = mock(Store.class);
        PayrollPolicy policy = new PayrollPolicy();
        when(storeRepository.findById(2L)).thenReturn(Optional.of(store));
        when(payrollPolicyRepository.findByStore(store)).thenReturn(Optional.of(policy));

        assertThatThrownBy(() -> service.updatePayrollPolicy(2L, policyUpdate(LocalTime.of(6, 0))))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo("NIGHT_WORK_START_INVALID");
    }

    @Test
    void rejectsEarlierEveningStartBecauseCalculatorUsesAStatutoryNightWindow() {
        Store store = mock(Store.class);
        PayrollPolicy policy = new PayrollPolicy();
        when(storeRepository.findById(3L)).thenReturn(Optional.of(store));
        when(payrollPolicyRepository.findByStore(store)).thenReturn(Optional.of(policy));

        assertThatThrownBy(() -> service.updatePayrollPolicy(3L, policyUpdate(LocalTime.of(21, 0))))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo("NIGHT_WORK_START_INVALID");
    }

    @Test
    void acceptsOnlyStatutoryNightStart() {
        Store store = mock(Store.class);
        PayrollPolicy policy = new PayrollPolicy();
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(payrollPolicyRepository.findByStore(store)).thenReturn(Optional.of(policy));
        when(payrollPolicyRepository.save(policy)).thenReturn(policy);

        PayrollPolicy updated = service.updatePayrollPolicy(1L, policyUpdate(LocalTime.of(22, 0)));

        assertThat(updated.getNightWorkStartTime()).isEqualTo(LocalTime.of(22, 0));
    }

    private PayrollPolicyUpdateDto policyUpdate(LocalTime nightStart) {
        return PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(nightStart)
                .build();
    }
}
