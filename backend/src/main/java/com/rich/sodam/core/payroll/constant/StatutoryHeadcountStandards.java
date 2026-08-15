package com.rich.sodam.core.payroll.constant;

import java.math.BigDecimal;
import java.util.List;

/**
 * 근로기준법 시행령 §7의2 상시 사용 근로자 수 산정 상수.
 *
 * <p>산정 방식: 산정기간(사유 발생일 전 1개월) 중 사용한 근로자 연인원 ÷ 같은 기간 가동일수.
 * 값 변경 시 이 파일만 수정하면 {@link com.rich.sodam.service.StatutoryHeadcountService}
 * 전체에 반영된다. G-18: 산정기간·가동일수 정의는 노무사 서면 회신 전 참고값이다.
 *
 * <p>⚠️ {@link SubsidyStandards#HEADCOUNT_LIMIT}(두루누리 10인)과 별개 제도·별개 산식이다.
 * 이 상수는 통합고용세액공제 상시근로자 집계({@code EmploymentCreditService})와도 무관하다 —
 * 그 산식은 "그 달 출근 기록이 있는 직원의 distinct 수"로 근기법 산식과 값이 다르다.</p>
 */
public final class StatutoryHeadcountStandards {

    private StatutoryHeadcountStandards() {
    }

    /** 근로기준법 5인 이상 적용 경계(명). */
    public static final BigDecimal THRESHOLD = new BigDecimal("5");

    /** 산정기간 — 사유 발생일(기준일) 전 개월 수. */
    public static final int CALCULATION_PERIOD_MONTHS = 1;

    /** 참고 산정값 표시 소수 자리수. */
    public static final int SCALE = 1;

    /** 경계 근접(대시보드 노출) 폭 — 임계 ± 이 값 범위를 "근접"으로 본다. */
    public static final BigDecimal WATCH_ZONE_MARGIN = new BigDecimal("1");

    /** 인건비 영향 범위(하한) 산정용 — 신규 채용 인원의 가정 월 근로시간(단시간 근무 가정). */
    public static final BigDecimal SIMULATION_MONTHLY_HOURS_LOW = new BigDecimal("60");

    /** 인건비 영향 범위(상한) 산정용 — 신규 채용 인원의 가정 월 근로시간(주 40h 상근 환산, 주휴 포함 209h). */
    public static final BigDecimal SIMULATION_MONTHLY_HOURS_HIGH = MinimumWage.MONTHLY_STANDARD_HOURS;

    /**
     * 상시 5인 이상부터 새로 적용되는 근로기준법 주요 조항(참고용 목록).
     * G-18 노무사 서면 회신 전까지 잠정 목록 — 회신 후 항목만 교체한다.
     */
    public static final List<String> NEWLY_APPLICABLE_PROVISIONS = List.of(
            "연장·야간·휴일근로 가산수당(§56)",
            "연차유급휴가(§60)",
            "생리휴가(§73)",
            "해고 등의 제한 및 부당해고 구제신청(§23·§24·§27·§28)",
            "휴업수당(§46)"
    );
}
