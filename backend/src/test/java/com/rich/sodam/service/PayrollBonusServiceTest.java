package com.rich.sodam.service;

import com.rich.sodam.domain.PayrollBonus;
import com.rich.sodam.domain.type.BonusPaymentTiming;
import com.rich.sodam.repository.PayrollBonusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 즉시 보너스 — "오늘 바빠서 1만원 더" 정책 검증.
 */
@ExtendWith(MockitoExtension.class)
class PayrollBonusServiceTest {

    @Mock
    PayrollBonusRepository repository;
    @InjectMocks
    PayrollBonusService service;

    @Test
    @DisplayName("정상 입력이면 보너스가 생성된다")
    void createsWhenValid() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        PayrollBonus saved = service.create(
                1L, 2L, 99L, LocalDate.of(2026, 7, 1), 10_000, "마감 도와줘서 감사",
                BonusPaymentTiming.INCLUDED_IN_PAYROLL);

        assertThat(saved.getStoreId()).isEqualTo(1L);
        assertThat(saved.getEmployeeId()).isEqualTo(2L);
        assertThat(saved.getCreatedByMasterId()).isEqualTo(99L);
        assertThat(saved.getAmount()).isEqualTo(10_000);
        assertThat(saved.isConsumed()).isFalse();
    }

    @Test
    @DisplayName("금액이 0 이하면 거부된다")
    void rejectsNonPositiveAmount() {
        assertThatThrownBy(() -> service.create(
                1L, 2L, 99L, LocalDate.now(), 0, "사유", BonusPaymentTiming.IMMEDIATE_CASH))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> service.create(
                1L, 2L, 99L, LocalDate.now(), -5_000, "사유", BonusPaymentTiming.IMMEDIATE_CASH))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("지급일 누락 시 거부된다")
    void rejectsMissingDate() {
        assertThatThrownBy(() -> service.create(
                1L, 2L, 99L, null, 10_000, "사유", BonusPaymentTiming.IMMEDIATE_CASH))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("지급 방식 누락 시 거부된다")
    void rejectsMissingTiming() {
        assertThatThrownBy(() -> service.create(
                1L, 2L, 99L, LocalDate.now(), 10_000, "사유", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("즉시 현금 지급은 급여 정산 조회 대상에서 빠진다")
    void immediateCashExcludedFromPayrollLookup() {
        LocalDate from = LocalDate.of(2026, 7, 1);
        LocalDate to = LocalDate.of(2026, 7, 31);
        when(repository.findByEmployeeIdAndStoreIdAndPaymentTimingAndIncludedInPayrollIdIsNullAndBonusDateBetween(
                2L, 1L, BonusPaymentTiming.INCLUDED_IN_PAYROLL, from, to))
                .thenReturn(List.of());

        List<PayrollBonus> result = service.findUnconsumedForPeriod(2L, 1L, from, to);

        assertThat(result).isEmpty();
        verify(repository).findByEmployeeIdAndStoreIdAndPaymentTimingAndIncludedInPayrollIdIsNullAndBonusDateBetween(
                2L, 1L, BonusPaymentTiming.INCLUDED_IN_PAYROLL, from, to);
    }

    @Test
    @DisplayName("markConsumed 는 보너스에 급여 id를 채워 재정산 시 중복 합산을 막는다")
    void markConsumedSetsPayrollId() {
        PayrollBonus bonus = new PayrollBonus();
        bonus.setAmount(10_000);

        service.markConsumed(List.of(bonus), 555L);

        assertThat(bonus.getIncludedInPayrollId()).isEqualTo(555L);
        assertThat(bonus.isConsumed()).isTrue();

        ArgumentCaptor<List<PayrollBonus>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(1);
    }
}
