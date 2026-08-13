package com.rich.sodam.core.payroll.weeklyallowance;

import java.time.DayOfWeek;
import java.util.Locale;

/**
 * 서명 근로계약서의 주휴일을 주 기산일로 해석하는 규칙이다.
 *
 * <p>주휴일과 주 기산일의 관계는 계약·취업규칙 및 노무 검토에 따라 달라질 수 있으므로,
 * {@code SODAM_PAYROLL_CONTRACT_WEEK_START_RULE} 한 값으로만 결정한다. 새 법적 판단을
 * 코드 분기로 고정하지 않도록 이 enum 외부에서 요일을 변환하지 않는다.</p>
 */
public enum ContractWeekStartRule {

    /** 계약서에 적힌 주휴일 당일을 해당 주의 기산일로 사용한다. */
    WEEKLY_HOLIDAY_DAY,

    /** 계약서에 적힌 주휴일의 다음 날을 해당 주의 기산일로 사용한다. */
    DAY_AFTER_WEEKLY_HOLIDAY;

    public DayOfWeek weekStartDay(String weeklyHolidayDay) {
        DayOfWeek weeklyHoliday = DayOfWeek.valueOf(weeklyHolidayDay.trim().toUpperCase(Locale.ROOT));
        return this == DAY_AFTER_WEEKLY_HOLIDAY ? weeklyHoliday.plus(1) : weeklyHoliday;
    }
}
