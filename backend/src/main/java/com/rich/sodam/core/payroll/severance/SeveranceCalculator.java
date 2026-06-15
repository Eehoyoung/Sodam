package com.rich.sodam.core.payroll.severance;

import org.springframework.stereotype.Component;

/**
 * 퇴직금 계산기 (근로자퇴직급여보장법 §8). 단일 책임(SRP) — 법정 산식만 담당.
 *
 * <p>퇴직금 = 1일 평균임금 × 30 × (재직일수 ÷ 365)</p>
 *
 * <p>지급 대상: 계속근로 1년 이상 + 4주 평균 1주 소정근로 15시간 이상.
 * 본 계산기는 <b>1년(365일) 이상</b> 만 판정하며, 주 15시간 요건·평균임금 산정(최근 3개월 임금총액 ÷ 일수)은
 * 호출측(출퇴근·급여 데이터)이 제공한다. 결과는 입력 기준 <b>추정치</b>이며 실제는 평균임금·재직기간 확정에 따라 달라진다.</p>
 */
@Component
public class SeveranceCalculator {

    /** 퇴직금 산식 상수 (법 §8: 30일분 평균임금 / 1년 = 365일) */
    private static final int DAYS_PER_YEAR_OF_SERVICE = 30;
    private static final double DAYS_IN_YEAR = 365.0;
    private static final long MIN_TENURE_DAYS = 365L;

    /** 계속근로 1년 이상이면 (다른 요건 충족 전제) 지급 대상. */
    public boolean isEligible(long tenureDays) {
        return tenureDays >= MIN_TENURE_DAYS;
    }

    /**
     * 퇴직금 추정액(원).
     *
     * @param averageDailyWage 1일 평균임금(원)
     * @param tenureDays       재직 일수
     * @return 1년 미만이면 0, 그 외 = 평균임금 × 30 × 재직일수/365 (반올림)
     */
    public long estimate(long averageDailyWage, long tenureDays) {
        if (tenureDays < MIN_TENURE_DAYS || averageDailyWage <= 0) {
            return 0L;
        }
        return Math.round(averageDailyWage * (double) DAYS_PER_YEAR_OF_SERVICE * tenureDays / DAYS_IN_YEAR);
    }
}
