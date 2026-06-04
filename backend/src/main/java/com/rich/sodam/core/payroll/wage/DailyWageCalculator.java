package com.rich.sodam.core.payroll.wage;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import org.springframework.stereotype.Component;

/**
 * 일급 계산기 — 기본임금 + 연장·야간 가산을 근로기준법 §56 구조로 산정. 단일 책임(SRP).
 *
 * <p>가산 구조(노무사 확정):
 * <ul>
 *   <li>기본근로: 정상시간 × 시급 × 1.0</li>
 *   <li>연장근로: 연장시간 × 시급 × 1.5 (기본100 + 가산50)</li>
 *   <li>야간근로: 야간시간 × 시급 × <b>0.5(가산분만)</b> — 야간시간은 이미 정상/연장에 기본임금이 지급되므로
 *       0.5 만 추가한다. 구 로직은 1.5 를 통째로 더해 같은 시간을 이중 지급(최대 야간 250%/연장야간 300%)했다.</li>
 * </ul></p>
 *
 * <p>5인 미만 사업장(§11, §56 적용제외): 연장·야간 가산을 적용하지 않는다(가산분 0). 단 기본임금은 지급.</p>
 */
@Component
public class DailyWageCalculator {

    /**
     * @param hourlyWage      적용 시급(원)
     * @param regularHours    정상근로 시간(8h 이내)
     * @param overtimeHours   연장근로 시간(8h 초과)
     * @param nightHours      야간근로 시간(22:00~06:00 겹치는 모든 시간)
     * @param premiumApplicable 가산 적용 여부(5인 이상 true, 5인 미만 false)
     */
    public DailyWageResult calculate(int hourlyWage,
                                     double regularHours,
                                     double overtimeHours,
                                     double nightHours,
                                     boolean premiumApplicable) {
        int regularWage = (int) Math.round(hourlyWage * regularHours);

        double overtimeMultiplier = premiumApplicable
                ? 1.0 + LaborStandards.OVERTIME_PREMIUM.doubleValue() // 1.5
                : 1.0; // 5인 미만: 가산 없음
        int overtimeWage = (int) Math.round(hourlyWage * overtimeHours * overtimeMultiplier);

        double nightMultiplier = premiumApplicable
                ? LaborStandards.NIGHT_PREMIUM.doubleValue() // 0.5 가산분만
                : 0.0; // 5인 미만: 야간가산 없음
        int nightWorkWage = (int) Math.round(hourlyWage * nightHours * nightMultiplier);

        return new DailyWageResult(regularWage, overtimeWage, nightWorkWage);
    }

    /**
     * 휴일근로 임금(§56②). 휴일에는 기본 100% + 가산(8h 이내 50%, 8h 초과분 100%)을 지급한다.
     * 휴일근로는 정상/연장 구조를 대체하므로 별도 계산한다.
     *
     * @param hourlyWage        적용 시급(원)
     * @param holidayHours      휴일 근로시간(휴게 공제 후)
     * @param premiumApplicable 가산 적용 여부(5인 이상 true). 5인 미만은 기본 100%만.
     */
    public int holidayWage(int hourlyWage, double holidayHours, boolean premiumApplicable) {
        if (holidayHours <= 0) {
            return 0;
        }
        double within = Math.min(holidayHours, LaborStandards.STATUTORY_DAILY_HOURS);
        double over = Math.max(0, holidayHours - LaborStandards.STATUTORY_DAILY_HOURS);

        double withinMultiplier = premiumApplicable
                ? 1.0 + LaborStandards.HOLIDAY_PREMIUM_WITHIN_8H.doubleValue() // 1.5
                : 1.0;
        double overMultiplier = premiumApplicable
                ? 1.0 + LaborStandards.HOLIDAY_PREMIUM_OVER_8H.doubleValue() // 2.0
                : 1.0;

        return (int) Math.round(hourlyWage * within * withinMultiplier
                + hourlyWage * over * overMultiplier);
    }
}
