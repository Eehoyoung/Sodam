package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 4대보험 신고 유형. 소담은 <b>신고서 서식 자동작성</b>까지만 — 공단 제출(EDI 접수)은 사장이 직접 한다.
 * (공인노무사법·보험사무대행 위반 회피: 소담 명의 대행 금지)
 */
@Getter
public enum InsuranceFilingType {
    ACQUISITION("자격취득 신고"),
    LOSS("자격상실 신고"),
    MONTHLY_WAGE("보수월액 신고");

    private final String displayName;

    InsuranceFilingType(String displayName) {
        this.displayName = displayName;
    }
}
