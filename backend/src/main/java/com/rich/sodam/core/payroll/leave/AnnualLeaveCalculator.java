package com.rich.sodam.core.payroll.leave;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import org.springframework.stereotype.Component;

/**
 * 연차유급휴가 일수 계산기 (근로기준법 §60). 단일 책임(SRP).
 *
 * <p>5인 미만 사업장은 연차 미적용(§11). 주 소정근로시간 15시간 미만은 §18③에 따라
 * 연차 자체가 미적용(발생 0)이며, 이 판정은 본 계산기 내부에서 수행한다(호출측이 빠뜨리면
 * 안 되는 법정 요건이므로 계산기가 최종 책임을 진다).</p>
 *
 * <p>본 계산기는 법정 산식만 담당하고, 실제 출근율·계속근로기간 산정은 호출측(출퇴근 데이터)이
 * 제공한다.</p>
 *
 * <p>출처: 근로기준법 §60①②④, §18③, 고용노동부 행정해석, 대법원 2021다227100(기간제 정확히
 * 1년 계약 만료 시 15일 연차청구권 미발생).</p>
 */
@Component
public class AnnualLeaveCalculator {

    /**
     * 입사 1년 미만(또는 1년간 80% 미만 출근) 근로자의 월 단위 연차(§60②).
     *
     * <p>주 소정근로시간 체크가 필요하면 {@link #firstYearMonthly(int, boolean, double)}를 사용할 것.
     * 이 오버로드는 이미 15시간 이상임이 확인된 경우에만 호출한다(하위호환 유지용).</p>
     *
     * @param fullAttendanceMonths 개근(만근)한 개월 수
     * @param fiveOrMore           5인 이상 사업장 여부
     * @return 발생 연차일수 (최대 11일)
     */
    public int firstYearMonthly(int fullAttendanceMonths, boolean fiveOrMore) {
        if (!fiveOrMore || fullAttendanceMonths <= 0) {
            return 0;
        }
        return Math.min(fullAttendanceMonths, LaborStandards.ANNUAL_LEAVE_FIRST_YEAR_MAX);
    }

    /**
     * 입사 1년 미만 근로자의 월 단위 연차(§60②) — 주 소정근로시간 §18③ 체크 포함.
     *
     * @param fullAttendanceMonths 개근(만근)한 개월 수
     * @param fiveOrMore           5인 이상 사업장 여부
     * @param weeklyHours          주 소정근로시간(시간). 15시간 미만이면 0(§18③).
     * @return 발생 연차일수 (최대 11일)
     */
    public int firstYearMonthly(int fullAttendanceMonths, boolean fiveOrMore, double weeklyHours) {
        if (!isWeeklyHoursEligible(weeklyHours)) {
            return 0;
        }
        return firstYearMonthly(fullAttendanceMonths, fiveOrMore);
    }

    /**
     * 1년 이상 계속근로자의 연차(§60①④).
     *
     * <p>주 소정근로시간 체크가 필요하면 {@link #annual(int, double, boolean, double)}를 사용할 것.
     * 이 오버로드는 이미 15시간 이상임이 확인된 경우에만 호출한다(하위호환 유지용).</p>
     *
     * @param completedYears        계속근로 연수(완료된 햇수, 1 이상)
     * @param attendanceRate        해당 연도 출근율(0.0~1.0)
     * @param fiveOrMore            5인 이상 사업장 여부
     * @return 발생 연차일수 (15일 기본, 3년 이상 매 2년 +1, 최대 25일). 80% 미만이면 0(월 단위로 별도 산정).
     */
    public int annual(int completedYears, double attendanceRate, boolean fiveOrMore) {
        if (!fiveOrMore || completedYears < 1) {
            return 0;
        }
        if (attendanceRate < LaborStandards.ANNUAL_LEAVE_ATTENDANCE_THRESHOLD) {
            return 0; // 80% 미만 → §60② 월 단위(firstYearMonthly)로 산정
        }
        int additional = (completedYears - 1) / 2; // 3년차부터 2년마다 +1
        return Math.min(LaborStandards.ANNUAL_LEAVE_BASE + additional, LaborStandards.ANNUAL_LEAVE_MAX);
    }

    /**
     * 1년 이상 계속근로자의 연차(§60①④) — 주 소정근로시간 §18③ 체크 포함.
     *
     * @param completedYears 계속근로 연수(완료된 햇수, 1 이상)
     * @param attendanceRate 해당 연도 출근율(0.0~1.0)
     * @param fiveOrMore     5인 이상 사업장 여부
     * @param weeklyHours    주 소정근로시간(시간). 15시간 미만이면 0(§18③).
     * @return 발생 연차일수
     */
    public int annual(int completedYears, double attendanceRate, boolean fiveOrMore, double weeklyHours) {
        if (!isWeeklyHoursEligible(weeklyHours)) {
            return 0;
        }
        return annual(completedYears, attendanceRate, fiveOrMore);
    }

    /**
     * 1년 이상 계속근로자의 연차 — 기간제 정확히 1년 계약 만료 예외(대법원 2021다227100) 반영.
     *
     * <p>기간제 근로자가 근로계약기간을 정확히 1년으로 체결하고 그 기간 만료로 그대로 종료되는
     * 경우, 계속근로 1년을 채우는 시점에 이미 근로관계가 종료돼 있어 §60① 15일 연차청구권이
     * 발생하지 않고 §60② 상한(11일)만 인정된다. {@code completedYears==1}이고
     * {@code exactlyOneYearFixedTermExpiring=true}일 때만 이 예외가 적용된다.</p>
     *
     * @param completedYears                     계속근로 연수(완료된 햇수, 1 이상)
     * @param attendanceRate                     해당 연도 출근율(0.0~1.0)
     * @param fiveOrMore                          5인 이상 사업장 여부
     * @param weeklyHours                         주 소정근로시간(시간)
     * @param exactlyOneYearFixedTermExpiring     기간제 계약이 정확히 1년이고 그 만료로 종료(예정)인지
     * @return 발생 연차일수
     */
    public int annualConsideringFixedTermException(int completedYears, double attendanceRate, boolean fiveOrMore,
                                                     double weeklyHours, boolean exactlyOneYearFixedTermExpiring) {
        if (completedYears == 1 && exactlyOneYearFixedTermExpiring) {
            if (!isWeeklyHoursEligible(weeklyHours) || !fiveOrMore) {
                return 0;
            }
            return LaborStandards.ANNUAL_LEAVE_FIRST_YEAR_MAX; // §60② 상한(11일)만 인정
        }
        return annual(completedYears, attendanceRate, fiveOrMore, weeklyHours);
    }

    /**
     * 비례연차(단시간근로자, §18③) — 통상근로자 발생일수를 시간 단위로 환산한다.
     *
     * <p>통상근로자 연차일수 × (해당자 주소정근로시간 / 40) × 8시간. 주 40시간 이상 근무자는
     * 비율이 1.0으로 클램프되어 통상근로자와 동일하게(비례 없이) 산정된다.</p>
     *
     * @param fullTimeLeaveDays 통상근로자 기준 발생 연차일수({@link #annual}/{@link #firstYearMonthly} 결과)
     * @param weeklyHours       해당 근로자의 주 소정근로시간(시간)
     * @return 비례 연차 시간(시간 단위)
     */
    public double proportionalHours(int fullTimeLeaveDays, double weeklyHours) {
        double statutoryWeeklyHours = LaborLawConstants.STATUTORY_WEEKLY_HOURS.doubleValue();
        double cappedWeeklyHours = Math.min(Math.max(weeklyHours, 0), statutoryWeeklyHours);
        double ratio = cappedWeeklyHours / statutoryWeeklyHours;
        return fullTimeLeaveDays * ratio * LaborLawConstants.STATUTORY_DAILY_HOURS.doubleValue();
    }

    /** 주 소정근로시간이 §18③ 기준(15시간) 이상인지. */
    public static boolean isWeeklyHoursEligible(double weeklyHours) {
        return weeklyHours >= LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue();
    }
}
