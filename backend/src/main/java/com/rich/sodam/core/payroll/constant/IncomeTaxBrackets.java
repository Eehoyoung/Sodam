package com.rich.sodam.core.payroll.constant;

/**
 * 종합소득세 누진세율표 (T-NEW-05 세무 시뮬레이터용). 정책 변동 대비 분리.
 *
 * <p>과세표준 구간별 세율·누진공제. 산출세액 = 과세표준 × 세율 − 누진공제.
 * <b>참고용 추정</b> — 실제 세액은 공제·감면 등에 따라 달라지므로 세무사 검토 필요.
 */
public final class IncomeTaxBrackets {

    private IncomeTaxBrackets() {
    }

    /** 구간 상한(과세표준, 원). 마지막은 Long.MAX_VALUE. */
    public static final long[] UPPER_BOUND = {
            14_000_000L, 50_000_000L, 88_000_000L, 150_000_000L,
            300_000_000L, 500_000_000L, 1_000_000_000L, Long.MAX_VALUE
    };

    /** 구간별 세율. */
    public static final double[] RATE = {
            0.06, 0.15, 0.24, 0.35, 0.38, 0.40, 0.42, 0.45
    };

    /** 구간별 누진공제(원). */
    public static final long[] PROGRESSIVE_DEDUCTION = {
            0L, 1_260_000L, 5_760_000L, 15_440_000L,
            19_940_000L, 25_940_000L, 35_940_000L, 65_940_000L
    };

    /** 과세표준에 대한 산출세액(누진공제 방식). 음수 입력은 0. */
    public static long estimatedTax(long taxableIncome) {
        if (taxableIncome <= 0) {
            return 0;
        }
        for (int i = 0; i < UPPER_BOUND.length; i++) {
            if (taxableIncome <= UPPER_BOUND[i]) {
                long tax = Math.round(taxableIncome * RATE[i]) - PROGRESSIVE_DEDUCTION[i];
                return Math.max(0, tax);
            }
        }
        return 0;
    }
}
