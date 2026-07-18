package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 고용(임금) 형태 — 직원-매장 관계 단위로 설정한다.
 *
 * <ul>
 *   <li>{@link #HOURLY} 시급제: 출퇴근 기록 × 적용시급으로 임금 산정(기존 경로). 주휴수당 별도 가산.</li>
 *   <li>{@link #MONTHLY_SALARY} 월급제: 고정 월급 기반. 주휴수당은 월급에 포함(근로기준법 시행령 §6②
 *       월 통상임금 산정 기준시간 209h = 소정 174h + 주휴 35h)이며, 연장·야간·휴일 가산(§56)은
 *       통상시급(월급÷209h) 기준으로 별도 지급한다.</li>
 * </ul>
 */
@Getter
public enum EmploymentType {
    HOURLY("시급제"),
    MONTHLY_SALARY("월급제");

    private final String description;

    EmploymentType(String description) {
        this.description = description;
    }
}
