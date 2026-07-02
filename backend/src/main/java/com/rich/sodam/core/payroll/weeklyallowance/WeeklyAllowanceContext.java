package com.rich.sodam.core.payroll.weeklyallowance;

import java.math.BigDecimal;

/**
 * 주휴수당 1주 산정 입력값 (불변 value object).
 *
 * <p>한 직원·한 주(週) 단위 산정에 필요한 최소 정보를 담는다. 전략(strategy)들은 이 컨텍스트만 보고
 * 계산하므로, DB·엔티티에 의존하지 않아 단위 테스트가 쉽다.</p>
 *
 * @param hourlyWage          적용 시급(원)
 * @param weeklyContractedHours 1주 소정근로시간(시간). 연장근로를 제외한 약정 근로시간.
 *                              실데이터에서 추정 시 {@code min(주 실근로, 40)} 으로 캡(cap)하여 연장분이 부풀리지 않게 한다.
 * @param scheduledDays      해당 주 소정근로일 수(개근 판정 분모). 알 수 없으면 {@code workedDays} 와 같게 둔다.
 * @param workedDays         해당 주 실제 출근일 수(개근 판정 분자).
 * @param pattern            근무 형태. 미지정이면 {@link WeeklyWorkPattern#AUTO}.
 */
public record WeeklyAllowanceContext(
        BigDecimal hourlyWage,
        BigDecimal weeklyContractedHours,
        int scheduledDays,
        int workedDays,
        WeeklyWorkPattern pattern
) {

    public WeeklyAllowanceContext {
        if (hourlyWage == null || hourlyWage.signum() < 0) {
            throw new IllegalArgumentException("hourlyWage must be >= 0");
        }
        if (weeklyContractedHours == null || weeklyContractedHours.signum() < 0) {
            throw new IllegalArgumentException("weeklyContractedHours must be >= 0");
        }
        if (pattern == null) {
            pattern = WeeklyWorkPattern.AUTO;
        }
    }

    /**
     * 소정근로일 개근 여부. 결근(소정근로일 중 미출근)이 있으면 주휴 미발생.
     * scheduledDays 가 0 이하(정보 없음)이면 보수적으로 개근으로 간주하지 않고 workedDays 기준으로만 판단.
     */
    public boolean isPerfectAttendance() {
        if (scheduledDays <= 0) {
            // 소정근로일 정보가 없으면 출근일이 1일 이상이면 개근으로 간주(현 데이터 모델 한계 — 보강 대상).
            return workedDays > 0;
        }
        return workedDays >= scheduledDays;
    }

    /** 주휴수당 발생 최소 시간(15h) 요건 충족 여부. */
    public boolean meetsMinimumHours() {
        return weeklyContractedHours.compareTo(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE) >= 0;
    }
}
