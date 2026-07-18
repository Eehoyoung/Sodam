package com.rich.sodam.dto.response;

/**
 * 직원 본인용 잔여 연차 응답 (E-NEW-03 내 잔여 연차).
 *
 * <p>발생 연차(근로기준법 §60, 출근율 100% 가정 추정) − 승인된 휴가 사용일수 = 잔여.
 * 5인 미만 사업장이면 연차 미적용(§11)이라 발생·잔여 모두 0이고 {@code fiveOrMoreApplicable=false}.</p>
 *
 * <p>실제 출근율·결근·계속근로기간에 따라 달라지므로 참고용 추정치다. {@code disclaimer} 면책 문구를
 * 화면에 반드시 노출한다.</p>
 *
 * @param entitledDays          발생 연차일수(추정)
 * @param usedDays              승인된 휴가 사용일수(반차 0.5·시간단위 환산 포함 — 소수 가능)
 * @param remainingDays         잔여 연차일수(발생 − 사용, 음수면 0. 소수 가능)
 * @param fiveOrMoreApplicable  5인 이상 사업장 여부(연차 적용 대상)
 * @param disclaimer            면책 문구(참고용 추정 안내)
 */
public record MyLeaveBalanceDto(
        int entitledDays,
        double usedDays,
        double remainingDays,
        boolean fiveOrMoreApplicable,
        String disclaimer
) {
}
