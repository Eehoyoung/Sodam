package com.rich.sodam.service;

import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.dto.request.PayrollPolicyUpdateDto;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PayrollPolicyServiceTest {

    private final PayrollPolicyRepository payrollPolicyRepository = mock(PayrollPolicyRepository.class);
    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final PayrollPolicyService service = new PayrollPolicyService(payrollPolicyRepository, storeRepository);

    // 야간 시작 시각(22:00 고정)·일 소정근로시간(8h 상한) 거절 검증은 DTO Bean Validation 이
    // 담당하므로 PayrollPolicyUpdateDtoTest 가 덮는다. 여기서 중복 검증하면
    // api-design.md("서비스 안에서 수동 검증 중복 금지")와 어긋나는 구조를 테스트가 고정해버린다.

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
