package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.TaxPolicyType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class PayrollPolicyUpdateDtoTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void regularHoursAboveStatutoryDailyLimitAreRejected() {
        PayrollPolicyUpdateDto dto = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .regularHoursPerDay(8.1)
                .build();

        assertThat(validator.validate(dto)).isNotEmpty();
    }

    @Test
    void nightStartLaterThanStatutoryStartIsRejected() {
        PayrollPolicyUpdateDto dto = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(LocalTime.of(22, 1))
                .build();

        assertThat(validator.validate(dto)).isNotEmpty();
    }

    @Test
    void onlyStatutoryNightStartIsAllowed() {
        PayrollPolicyUpdateDto invalid = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(LocalTime.MIDNIGHT)
                .build();
        PayrollPolicyUpdateDto sixAm = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(LocalTime.of(6, 0))
                .build();
        PayrollPolicyUpdateDto evening = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(LocalTime.of(21, 0))
                .build();
        PayrollPolicyUpdateDto statutory = PayrollPolicyUpdateDto.builder()
                .taxPolicyType(TaxPolicyType.INCOME_TAX_3_3)
                .nightWorkStartTime(LocalTime.of(22, 0))
                .build();

        assertThat(validator.validate(invalid)).isNotEmpty();
        assertThat(validator.validate(sixAm)).isNotEmpty();
        assertThat(validator.validate(evening)).isNotEmpty();
        assertThat(validator.validate(statutory)).isEmpty();
    }
}
