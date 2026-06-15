package com.rich.sodam.core.payroll.leave;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import org.springframework.stereotype.Component;

/**
 * 연차유급휴가 일수 계산기 (근로기준법 §60). 단일 책임(SRP).
 *
 * <p>5인 미만 사업장은 연차 미적용(§11). 본 계산기는 법정 산식만 담당하고,
 * 실제 출근율·계속근로기간 산정은 호출측(출퇴근 데이터)이 제공한다.</p>
 *
 * <p>출처: 근로기준법 §60①②④, 고용노동부 행정해석.</p>
 */
@Component
public class AnnualLeaveCalculator {

    /**
     * 입사 1년 미만(또는 1년간 80% 미만 출근) 근로자의 월 단위 연차(§60②).
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
     * 1년 이상 계속근로자의 연차(§60①④).
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
}
