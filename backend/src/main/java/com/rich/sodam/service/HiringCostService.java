package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.SocialInsuranceRates;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.dto.response.HiringCostResponse;
import com.rich.sodam.dto.response.HiringCostResponse.EmployerInsurance;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * 채용 총비용 시뮬레이터 — "시급 X원, 주 Y시간이면 실제로 한 달에 얼마가 드나"를
 * 사업주 관점에서 개략 추정한다(기존 급여 엔진 상수 재사용, 신규 테이블 없음).
 *
 * <p>계산 규칙:
 * <ul>
 *   <li>월환산: 주→월 4.345배 관례(1년 52.14주 / 12개월)</li>
 *   <li>주휴수당: 주 15시간 이상 시 (주시간/40)×8h, 상한 8h — {@link LaborLawConstants}</li>
 *   <li>4대보험 <b>사업주 부담분</b>: 국민연금·건강 50%(근로자와 동률, 국민연금은 기준소득월액 캡),
 *       고용은 실업급여 0.9%+고용안정·직능 0.25%(근로자분 0.9%와 다름), 산재는 전액 사업주(업종 평균 근사)</li>
 *   <li>퇴직금 적립: 월급여/12 (1년 근속 시 30일분 평균임금 채권 대비)</li>
 * </ul>
 * 실제 고지액은 공단 산정이 최종 — FE 에 "개략 추정치" 표기 필요.</p>
 */
@Service
public class HiringCostService {

    /** 입력 검증 경계. */
    static final int MIN_HOURLY_WAGE = 1_000;
    static final int MAX_HOURLY_WAGE = 1_000_000;
    static final BigDecimal MIN_WEEKLY_HOURS = BigDecimal.ONE;
    static final BigDecimal MAX_WEEKLY_HOURS = new BigDecimal("52");

    /** 주→월 환산 계수(관례). */
    private static final BigDecimal WEEKS_PER_MONTH = new BigDecimal("4.345");

    public HiringCostResponse simulate(int hourlyWage, double weeklyHours) {
        validate(hourlyWage, weeklyHours);

        BigDecimal wage = BigDecimal.valueOf(hourlyWage);
        BigDecimal hours = BigDecimal.valueOf(weeklyHours);

        // 1) 기본급(월) = 시급 × 주시간 × 4.345
        long monthlyBaseWage = wage.multiply(hours).multiply(WEEKS_PER_MONTH)
                .setScale(0, RoundingMode.HALF_UP).longValue();

        // 2) 주휴수당(월환산) — 15h 미만은 미발생(§18③)
        boolean eligible = hours.compareTo(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE) >= 0;
        long weeklyAllowance = 0;
        if (eligible) {
            // 주휴시간 = (주시간/40)×8, 상한 8h
            BigDecimal allowanceHours = hours.min(LaborLawConstants.STATUTORY_WEEKLY_HOURS)
                    .divide(LaborLawConstants.STATUTORY_WEEKLY_HOURS, 10, RoundingMode.HALF_UP)
                    .multiply(LaborLawConstants.STATUTORY_DAILY_HOURS)
                    .min(LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS);
            weeklyAllowance = wage.multiply(allowanceHours).multiply(WEEKS_PER_MONTH)
                    .setScale(0, RoundingMode.HALF_UP).longValue();
        }

        long monthlyGrossWage = monthlyBaseWage + weeklyAllowance;

        // 3) 4대보험 사업주 부담분 — 월급여(gross) 기준
        EmployerInsurance insurance = employerInsurance(monthlyGrossWage);

        // 4) 퇴직금 적립(월) = 월급여/12
        long severance = BigDecimal.valueOf(monthlyGrossWage)
                .divide(BigDecimal.valueOf(12), 0, RoundingMode.HALF_UP).longValue();

        long totalCost = monthlyGrossWage + insurance.total() + severance;
        return new HiringCostResponse(monthlyBaseWage, weeklyAllowance, monthlyGrossWage, eligible,
                insurance, severance, totalCost);
    }

    /**
     * 4대보험 사업주 부담분. 국민연금은 기준소득월액 상·하한 캡 적용(근로자분과 동일 규칙),
     * 건강보험엔 장기요양 사업주분(건강보험료액 × 비율) 포함, 산재는 전액 사업주(업종 평균 근사).
     */
    private EmployerInsurance employerInsurance(long grossWage) {
        BigDecimal gross = BigDecimal.valueOf(grossWage);
        LocalDate today = LocalDate.now();

        BigDecimal pensionBase = gross
                .max(SocialInsuranceRates.pensionBaseMin(today))
                .min(SocialInsuranceRates.pensionBaseMax(today));
        long nationalPension = pensionBase.multiply(SocialInsuranceRates.NATIONAL_PENSION_EMPLOYER)
                .setScale(0, RoundingMode.DOWN).longValue();

        long healthPremium = gross.multiply(SocialInsuranceRates.HEALTH_EMPLOYER)
                .setScale(0, RoundingMode.DOWN).longValue();
        long longTermCare = BigDecimal.valueOf(healthPremium)
                .multiply(SocialInsuranceRates.LTC_ON_HEALTH_PREMIUM)
                .setScale(0, RoundingMode.DOWN).longValue();
        long health = healthPremium + longTermCare;

        long employment = gross.multiply(SocialInsuranceRates.EMPLOYMENT_EMPLOYER)
                .setScale(0, RoundingMode.DOWN).longValue();
        long industrialAccident = gross.multiply(SocialInsuranceRates.INDUSTRIAL_ACCIDENT_EMPLOYER_AVG)
                .setScale(0, RoundingMode.DOWN).longValue();

        long total = nationalPension + health + employment + industrialAccident;
        return new EmployerInsurance(nationalPension, health, employment, industrialAccident, total);
    }

    private void validate(int hourlyWage, double weeklyHours) {
        if (hourlyWage < MIN_HOURLY_WAGE || hourlyWage > MAX_HOURLY_WAGE) {
            throw new IllegalArgumentException(
                    String.format("시급은 %,d원~%,d원 사이로 입력해 주세요.", MIN_HOURLY_WAGE, MAX_HOURLY_WAGE));
        }
        BigDecimal hours = BigDecimal.valueOf(weeklyHours);
        if (hours.compareTo(MIN_WEEKLY_HOURS) < 0 || hours.compareTo(MAX_WEEKLY_HOURS) > 0) {
            throw new IllegalArgumentException("주 근무시간은 1~52시간 사이로 입력해 주세요.");
        }
    }
}
