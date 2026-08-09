package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.deduction.DeductionBreakdown;
import com.rich.sodam.core.payroll.deduction.SocialInsuranceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.dto.response.PublicCalculatorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * 비로그인 공개 계산기(WP-A) — 주휴수당·최저임금·4대보험.
 *
 * <h3>DB 를 절대 조회하지 않는다</h3>
 * <p>입력값만으로 계산하는 순수 함수 경로다. 비인증 공개 API 라 매장·직원 데이터에 닿는 순간
 * 정보 노출 표면이 되고, 조회가 없으면 그 위험 자체가 성립하지 않는다.
 * {@code @Transactional}도 붙이지 않는다 — 읽을 것이 없다.</p>
 *
 * <h3>계산 규칙을 새로 쓰지 않는다</h3>
 * <p>{@code core/payroll}의 기존 상수·계산기를 그대로 쓴다. 여기에 요율을 복제하면 최저임금·
 * 4대보험 요율이 개정될 때 유료 계산과 공개 계산이 서로 다른 답을 내놓는다 — 소담이 파는 것이
 * "정확한 급여 계산"인데 유입용 계산기가 틀린 답을 주면 그게 최악이다.</p>
 */
@Service
@RequiredArgsConstructor
public class PublicCalculatorService {

    private final SocialInsuranceCalculator socialInsuranceCalculator;

    /**
     * 주휴수당 추정.
     *
     * <p>주 40시간 미만은 비례 산정하고 상한은 8시간이다({@link LaborLawConstants}).
     * 주 15시간 미만이면 발생하지 않는다 — 이 경계는 응답에도 명시한다.</p>
     */
    public PublicCalculatorResponse.WeeklyHoliday weeklyHoliday(double weeklyHours, int hourlyWage) {
        requirePositive(hourlyWage, "시급");
        if (weeklyHours < 0) {
            throw new IllegalArgumentException("주간 근로시간은 0 이상이어야 해요.");
        }

        BigDecimal hours = BigDecimal.valueOf(weeklyHours);
        boolean eligible = hours.compareTo(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE) >= 0;

        BigDecimal allowanceHours = BigDecimal.ZERO;
        long allowance = 0;
        if (eligible) {
            // 주 40시간 기준 비례 — 40시간 이상이면 상한 8시간.
            allowanceHours = hours.min(LaborLawConstants.STATUTORY_WEEKLY_HOURS)
                    .divide(LaborLawConstants.STATUTORY_WEEKLY_HOURS, 4, RoundingMode.HALF_UP)
                    .multiply(LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS);
            allowance = allowanceHours.multiply(BigDecimal.valueOf(hourlyWage))
                    .setScale(0, RoundingMode.HALF_UP).longValue();
        }

        return new PublicCalculatorResponse.WeeklyHoliday(
                eligible,
                weeklyHours,
                hourlyWage,
                allowanceHours.setScale(2, RoundingMode.HALF_UP).doubleValue(),
                allowance,
                List.of(
                        "결근·지각·조퇴, 주 중 입사·퇴사는 반영되지 않은 단순 추정치입니다.",
                        "1주 소정근로시간이 15시간 미만이면 주휴수당이 발생하지 않습니다.",
                        "소정근로일을 모두 개근해야 발생합니다.",
                        "이 결과를 사장님께 직접 임금 청구 근거로 제시하기보다, 실제 근태·계약 내용을 함께 확인하는 참고자료로 활용하세요.",
                        "임금 분쟁 시에는 고용노동부 상담(1350) 또는 공인노무사 상담을 이용하세요."),
                PublicCalculatorResponse.COMMON_DISCLAIMER);
    }

    /** 최저임금 미달 여부 — 연도별 고시 시급과 비교한다. */
    public PublicCalculatorResponse.MinimumWageCheck minimumWage(int year, int hourlyWage) {
        requirePositive(hourlyWage, "시급");
        BigDecimal minimum = MinimumWage.hourlyFor(year);
        boolean meets = MinimumWage.isAtLeastMinimum(hourlyWage, year);
        long shortfall = meets ? 0 : minimum.subtract(BigDecimal.valueOf(hourlyWage))
                .setScale(0, RoundingMode.HALF_UP).longValue();

        return new PublicCalculatorResponse.MinimumWageCheck(
                year, hourlyWage, minimum.setScale(0, RoundingMode.HALF_UP).longValue(), meets, shortfall,
                PublicCalculatorResponse.COMMON_DISCLAIMER);
    }

    /** 4대보험 근로자 부담분 추정 — 기존 {@link SocialInsuranceCalculator}를 그대로 사용한다. */
    public PublicCalculatorResponse.SocialInsurance socialInsurance(int grossWage) {
        requirePositive(grossWage, "월 급여");
        DeductionBreakdown breakdown = socialInsuranceCalculator.breakdown(grossWage);
        int total = breakdown.total();

        return new PublicCalculatorResponse.SocialInsurance(
                grossWage,
                breakdown.nationalPension(),
                breakdown.healthInsurance(),
                breakdown.longTermCare(),
                breakdown.employmentInsurance(),
                total,
                grossWage - total,
                List.of(
                        "근로자 부담분만 계산합니다(사업주 부담분 제외).",
                        "소득세·지방소득세는 반영되지 않았습니다 — 실수령액은 더 낮아집니다.",
                        "국민연금은 기준소득월액 상·하한이 적용되어 급여에 정비례하지 않을 수 있습니다."),
                PublicCalculatorResponse.COMMON_DISCLAIMER);
    }

    private static void requirePositive(int value, String label) {
        if (value <= 0) {
            throw new IllegalArgumentException(label + "은(는) 0보다 커야 해요.");
        }
    }
}
