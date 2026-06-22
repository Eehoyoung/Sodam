package com.rich.sodam.dto.response;

/**
 * 급여 미리보기(D0 aha, A1). 시급·주 근로시간만으로 <b>주휴 포함</b> 예상 급여를 즉시 보여준다.
 *
 * <p>영속화 없음 — 사장을 직원으로 등록하지 않고 계산만 한다(역할·직원수 부작용 0).
 * 추정치이므로 {@code disclaimer} 를 항상 함께 노출한다.
 *
 * @param hourlyWage            적용 시급(원)
 * @param weeklyHours           주 소정근로시간
 * @param weeklyBasic           주 기본급(시급×시간)
 * @param weeklyAllowance       주휴수당(주 단위)
 * @param monthlyBasic          월 환산 기본급
 * @param monthlyAllowance      월 환산 주휴수당
 * @param monthlyGross          월 예상 급여(세전)
 * @param weeklyAllowanceEligible 주휴 발생 요건(주 15h 이상) 충족 여부
 * @param disclaimer            면책 문구(참고용 추정)
 */
public record PayrollPreviewResponse(
        int hourlyWage,
        double weeklyHours,
        int weeklyBasic,
        int weeklyAllowance,
        int monthlyBasic,
        int monthlyAllowance,
        int monthlyGross,
        boolean weeklyAllowanceEligible,
        String disclaimer
) {
}
