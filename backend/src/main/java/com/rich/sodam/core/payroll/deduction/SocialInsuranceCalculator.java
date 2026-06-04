package com.rich.sodam.core.payroll.deduction;

import com.rich.sodam.core.payroll.constant.SocialInsuranceRates;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 4대보험 근로자 부담 공제 계산기 (2026). 단일 책임(SRP).
 *
 * <p>⚠️ 국민연금은 기준소득월액 상·하한 캡 후 요율, 장기요양은 건강보험료액 기준 2단계,
 * 산재보험은 근로자 공제 없음. 정확한 정산은 공단 EDI 가 최종이므로 명세서엔 "개략 추정치" 표기 필요.</p>
 */
@Component
public class SocialInsuranceCalculator {

    public int totalEmployeeDeduction(int grossWage) {
        return nationalPension(grossWage)
                + healthInsurance(grossWage)
                + longTermCare(grossWage)
                + employmentInsurance(grossWage);
    }

    /** 임금명세서(§48②) 항목별 공제내역. */
    public DeductionBreakdown breakdown(int grossWage) {
        return new DeductionBreakdown(
                nationalPension(grossWage),
                healthInsurance(grossWage),
                longTermCare(grossWage),
                employmentInsurance(grossWage));
    }

    public int nationalPension(int grossWage) {
        BigDecimal base = BigDecimal.valueOf(grossWage)
                .max(SocialInsuranceRates.PENSION_BASE_MIN)
                .min(SocialInsuranceRates.PENSION_BASE_MAX);
        return base.multiply(SocialInsuranceRates.NATIONAL_PENSION_EMPLOYEE)
                .setScale(0, RoundingMode.DOWN).intValue();
    }

    public int healthInsurance(int grossWage) {
        return BigDecimal.valueOf(grossWage)
                .multiply(SocialInsuranceRates.HEALTH_EMPLOYEE)
                .setScale(0, RoundingMode.DOWN).intValue();
    }

    public int longTermCare(int grossWage) {
        int healthPremium = healthInsurance(grossWage);
        return BigDecimal.valueOf(healthPremium)
                .multiply(SocialInsuranceRates.LTC_ON_HEALTH_PREMIUM)
                .setScale(0, RoundingMode.DOWN).intValue();
    }

    public int employmentInsurance(int grossWage) {
        return BigDecimal.valueOf(grossWage)
                .multiply(SocialInsuranceRates.EMPLOYMENT_EMPLOYEE)
                .setScale(0, RoundingMode.DOWN).intValue();
    }
}
