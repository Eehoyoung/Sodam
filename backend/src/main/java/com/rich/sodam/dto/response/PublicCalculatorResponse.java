package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 비로그인 공개 계산기 응답(WP-A).
 *
 * <p>모든 응답에 {@code disclaimer}가 붙는다 — 3자 교차검증(2026-08-07)이 정한 <b>배포 조건</b>이다.
 * 계산 결과가 법적 자문이나 확정 금액으로 오인되면 실제 임금 분쟁을 유발할 수 있다.</p>
 */
public final class PublicCalculatorResponse {

    private PublicCalculatorResponse() {
    }

    /** 공통 면책 — 법무·세무·노무가 공통으로 요구한 요소. */
    public static final List<String> COMMON_DISCLAIMER = List.of(
            "참고용 추정치이며 법적·세무적 자문이 아닙니다.",
            "실제 지급액·세액은 개별 근로조건과 법 개정에 따라 달라질 수 있습니다.",
            "정확한 판단은 공인노무사·세무사 등 전문가와 상담하세요.",
            "정부기관의 공식 계산기가 아닙니다.",
            "입력하신 값은 저장하지 않습니다.");

    /**
     * 주휴수당 — 노무 검토가 지정한 필수 고지가 추가로 붙는다.
     *
     * <p>이 계산기는 결근·지각·조퇴와 주중 입·퇴사를 입력받지 않으므로 실제보다 과다/과소 산정될 수
     * 있다. 그 한계를 응답에 명시하지 않으면 근로자가 잘못된 금액으로 사장에게 청구할 수 있다.</p>
     *
     * @param eligible          주휴수당 발생 요건(주 15시간 이상)을 충족하는지
     * @param weeklyHours       입력한 1주 소정근로시간
     * @param hourlyWage        입력한 시급
     * @param allowanceHours    주휴수당 산정 시간(주 40시간 미만은 비례, 상한 8시간)
     * @param weeklyAllowance   추정 주휴수당(원)
     * @param notices           이 계산기 고유의 한계 고지
     * @param disclaimer        공통 면책
     */
    public record WeeklyHoliday(
            boolean eligible,
            double weeklyHours,
            int hourlyWage,
            double allowanceHours,
            long weeklyAllowance,
            List<String> notices,
            List<String> disclaimer) {
    }

    /**
     * 최저임금 미달 여부.
     *
     * @param year          기준 연도
     * @param hourlyWage    입력한 시급
     * @param minimumWage   해당 연도 최저시급
     * @param meetsMinimum  최저임금 이상인지
     * @param shortfall     미달액(원, 충족 시 0)
     */
    public record MinimumWageCheck(
            int year,
            int hourlyWage,
            long minimumWage,
            boolean meetsMinimum,
            long shortfall,
            List<String> disclaimer) {
    }

    /**
     * 4대보험 근로자 부담분 추정.
     *
     * @param grossWage        입력한 월 급여(세전)
     * @param nationalPension  국민연금
     * @param healthInsurance  건강보험
     * @param longTermCare     장기요양
     * @param employmentIns    고용보험
     * @param total            근로자 부담 합계
     * @param netEstimate      4대보험만 뺀 추정 실수령(소득세 미반영)
     */
    public record SocialInsurance(
            int grossWage,
            int nationalPension,
            int healthInsurance,
            int longTermCare,
            int employmentIns,
            int total,
            int netEstimate,
            List<String> notices,
            List<String> disclaimer) {
    }
}
