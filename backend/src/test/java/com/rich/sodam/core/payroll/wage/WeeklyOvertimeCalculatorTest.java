package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WeeklyOvertimeCalculatorTest {

    private final WeeklyOvertimeCalculator calculator = new WeeklyOvertimeCalculator();

    @Test
    void sixSevenHourPayableDaysHaveTwoHoursOfWeeklyOvertime() {
        assertThat(calculator.additionalOvertimeHours(42.0, 0.0)).isEqualTo(2.0);
    }

    @Test
    void dailyOvertimeIsNotPremiumedAgainAsWeeklyOvertime() {
        assertThat(calculator.additionalOvertimeHours(45.0, 5.0)).isZero();
    }
}
