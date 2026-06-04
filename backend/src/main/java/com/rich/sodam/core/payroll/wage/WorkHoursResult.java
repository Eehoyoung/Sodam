package com.rich.sodam.core.payroll.wage;

/**
 * 근로시간 분해 결과: 휴게공제 후 정상/연장 시간과 공제된 휴게시간.
 *
 * @param regularHours 정상근로 시간(소정근로시간 이내, 휴게 공제 후)
 * @param overtimeHours 연장근로 시간(소정근로시간 초과분)
 * @param breakHours 공제된 무급 휴게시간(§54)
 */
public record WorkHoursResult(double regularHours, double overtimeHours, double breakHours) {

    public double paidHours() {
        return regularHours + overtimeHours;
    }
}
