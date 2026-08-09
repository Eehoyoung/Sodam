package com.rich.sodam.core.payroll.weeklyallowance;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;

import static org.assertj.core.api.Assertions.assertThat;

class ContractWeekStartRuleTest {

    @Test
    void contract_week_start_mapping_is_a_single_explicit_policy() {
        assertThat(ContractWeekStartRule.DAY_AFTER_WEEKLY_HOLIDAY.weekStartDay("SUNDAY"))
                .isEqualTo(DayOfWeek.MONDAY);
        assertThat(ContractWeekStartRule.WEEKLY_HOLIDAY_DAY.weekStartDay("SUNDAY"))
                .isEqualTo(DayOfWeek.SUNDAY);
    }
}
