package com.rich.sodam.service;

import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculatorResolver;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyWorkPattern;
import com.rich.sodam.dto.response.PayrollPreviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 급여 미리보기 계산 (D0 aha, A1). 시급·주 근로시간만으로 주휴 포함 월 예상급여를 산정한다.
 *
 * <p>핵심: 영속화 없이 <b>기존 주휴 전략</b>({@link WeeklyAllowanceCalculatorResolver})을 재사용 —
 * 노동법 로직을 중복 구현하지 않는다(프로젝트 운영 기준: 상수·계산 단일 출처). 추정치이므로 면책 동반.
 */
@Service
@RequiredArgsConstructor
public class PayrollPreviewService {

    /** 월 환산 주(週) 수 = 365 ÷ 7 ÷ 12. 한국 월 급여 환산 관행. */
    private static final BigDecimal WEEKS_PER_MONTH = new BigDecimal("4.345");

    /** 미리보기는 개근(소정근로일 모두 출근) 가정 — aha 시나리오. */
    private static final int ASSUMED_SCHEDULED_DAYS = 5;

    private final WeeklyAllowanceCalculatorResolver weeklyAllowanceResolver;

    public PayrollPreviewResponse preview(int hourlyWage, double weeklyHours) {
        if (hourlyWage < 0 || weeklyHours < 0) {
            throw new IllegalArgumentException("시급·근로시간은 0 이상이어야 해요.");
        }
        BigDecimal wage = BigDecimal.valueOf(hourlyWage);
        BigDecimal hours = BigDecimal.valueOf(weeklyHours);

        int weeklyBasic = hours.multiply(wage).setScale(0, RoundingMode.HALF_UP).intValue();

        WeeklyAllowanceContext ctx = new WeeklyAllowanceContext(
                wage, hours, ASSUMED_SCHEDULED_DAYS, ASSUMED_SCHEDULED_DAYS, WeeklyWorkPattern.AUTO);
        WeeklyAllowanceResult wa = weeklyAllowanceResolver.resolve(ctx);
        int weeklyAllowance = wa.amount().setScale(0, RoundingMode.HALF_UP).intValue();

        int monthlyBasic = BigDecimal.valueOf(weeklyBasic)
                .multiply(WEEKS_PER_MONTH).setScale(0, RoundingMode.HALF_UP).intValue();
        int monthlyAllowance = BigDecimal.valueOf(weeklyAllowance)
                .multiply(WEEKS_PER_MONTH).setScale(0, RoundingMode.HALF_UP).intValue();
        int monthlyGross = monthlyBasic + monthlyAllowance;

        return new PayrollPreviewResponse(
                hourlyWage, weeklyHours, weeklyBasic, weeklyAllowance,
                monthlyBasic, monthlyAllowance, monthlyGross,
                ctx.meetsMinimumHours(),
                "참고용 추정이에요. 실제 지급액은 근무 기록·공제에 따라 달라질 수 있어요.");
    }
}
