package com.rich.sodam.core.payroll.constant;

/**
 * 두루누리 사회보험료 지원 자격 상수 (B7/M-NEW-03).
 *
 * <p>근거: 두루누리 — 근로자 수 10명 미만 사업장 + 월평균 보수 기준 미만 신규가입자 사회보험료 일부 지원.
 * 정확한 지원액·요건은 근로복지공단 위임(앱은 자격 가능성 안내까지만). 값은 정책 변동 대비 분리.
 */
public final class SubsidyStandards {

    private SubsidyStandards() {
    }

    /** 두루누리 지원 대상 사업장 근로자 수 상한(미만). */
    public static final int HEADCOUNT_LIMIT = 10;

    /** 월평균 보수 기준(원, 미만일 때 대상 추정). 정책에 따라 갱신. */
    public static final int MONTHLY_WAGE_CAP = 2_700_000;
}
