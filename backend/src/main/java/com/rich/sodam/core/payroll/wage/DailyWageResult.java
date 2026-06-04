package com.rich.sodam.core.payroll.wage;

/**
 * 일급 계산 결과 (가산 구조 분리).
 *
 * @param regularWage   기본근로 임금(정상시간 × 시급 × 1.0)
 * @param overtimeWage  연장근로 임금(연장시간 × 시급 × 1.5; 5인 미만은 가산 없이 ×1.0)
 * @param nightWorkWage 야간 가산수당(야간시간 × 시급 × 0.5 가산분만; 5인 미만은 0)
 */
public record DailyWageResult(int regularWage, int overtimeWage, int nightWorkWage) {

    public int total() {
        return regularWage + overtimeWage + nightWorkWage;
    }
}
