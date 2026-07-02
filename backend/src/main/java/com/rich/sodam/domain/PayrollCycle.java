package com.rich.sodam.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * 매장 급여 정산 주기 설정 (값 객체).
 * <p>사장이 매장 생성/수정 시 직접 지정한다.
 * <ul>
 *   <li><b>정산 시작일</b>: {전월|당월} + 일</li>
 *   <li><b>정산 마감일</b>: {당월|익월} + 일 (또는 말일)</li>
 *   <li><b>급여 지급일</b>: {당월|익월} + 일 (또는 말일)</li>
 * </ul>
 * '일'은 사용자 편의를 위해 1자리 입력 시 0을 붙여 2자리 문자열("01"~"31")로 저장한다.
 * '말일'은 월마다 달라(28~31) 별도 boolean 플래그로 표현하고, 계산 시 그 달의 실제 말일로 해석한다.
 * <p>모든 컬럼 nullable — 기존 매장/미설정 매장을 위해 전체가 선택값이다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class PayrollCycle {

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_period_start_offset", length = 16)
    private MonthOffset startOffset;   // PREV_MONTH | CURRENT_MONTH

    @Column(name = "pay_period_start_day", length = 2)
    private String startDay;           // "01".."31"

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_period_end_offset", length = 16)
    private MonthOffset endOffset;     // CURRENT_MONTH | NEXT_MONTH

    @Column(name = "pay_period_end_day", length = 2)
    private String endDay;             // "01".."31" (말일이면 null)

    @Column(name = "pay_period_end_last_day")
    private Boolean endLastDay;        // 말일 여부

    @Enumerated(EnumType.STRING)
    @Column(name = "pay_day_offset", length = 16)
    private MonthOffset payOffset;     // CURRENT_MONTH | NEXT_MONTH

    @Column(name = "pay_day_day", length = 2)
    private String payDay;             // "01".."31" (말일이면 null)

    @Column(name = "pay_day_last_day")
    private Boolean payDayLastDay;     // 말일 지급 여부

    private PayrollCycle(MonthOffset startOffset, String startDay,
                         MonthOffset endOffset, String endDay, boolean endLastDay,
                         MonthOffset payOffset, String payDay, boolean payDayLastDay) {
        this.startOffset = startOffset;
        this.startDay = startDay;
        this.endOffset = endOffset;
        this.endDay = endLastDay ? null : endDay;
        this.endLastDay = endLastDay;
        this.payOffset = payOffset;
        this.payDay = payDayLastDay ? null : payDay;
        this.payDayLastDay = payDayLastDay;
    }

    /**
     * 입력값을 검증·정규화해 정산 주기를 생성한다.
     * 시작 오프셋은 전월/당월, 마감·지급 오프셋은 당월/익월만 허용한다.
     * '일'은 1~31 범위를 검증하고 2자리 문자열로 0 패딩한다.
     */
    public static PayrollCycle of(MonthOffset startOffset, Integer startDay,
                                  MonthOffset endOffset, Integer endDay, boolean endLastDay,
                                  MonthOffset payOffset, Integer payDay, boolean payDayLastDay) {
        require(startOffset == MonthOffset.PREV_MONTH || startOffset == MonthOffset.CURRENT_MONTH,
                "정산 시작 기준월은 전월 또는 당월이어야 합니다.");
        require(endOffset == MonthOffset.CURRENT_MONTH || endOffset == MonthOffset.NEXT_MONTH,
                "정산 마감 기준월은 당월 또는 익월이어야 합니다.");
        require(payOffset == MonthOffset.CURRENT_MONTH || payOffset == MonthOffset.NEXT_MONTH,
                "급여 지급 기준월은 당월 또는 익월이어야 합니다.");

        String start = normalizeDay(startDay, false, "정산 시작일");
        String end = normalizeDay(endDay, endLastDay, "정산 마감일");
        String pay = normalizeDay(payDay, payDayLastDay, "급여 지급일");

        return new PayrollCycle(startOffset, start, endOffset, end, endLastDay,
                payOffset, pay, payDayLastDay);
    }

    /**
     * 1자리 입력을 2자리("0X")로 패딩하고 1~31 범위를 검증한다.
     * 말일 플래그가 true면 일 입력을 무시(null 반환)한다.
     */
    private static String normalizeDay(Integer day, boolean lastDay, String label) {
        if (lastDay) {
            return null;
        }
        require(day != null, label + "을(를) 입력해 주세요.");
        require(day >= 1 && day <= 31, label + "은(는) 1~31 사이여야 합니다.");
        return String.format("%02d", day);
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalArgumentException(message);
        }
    }

    /** 정산 주기가 설정되어 있는지(필수 3요소 모두 존재). */
    public boolean isConfigured() {
        return startOffset != null && endOffset != null && payOffset != null;
    }

    /**
     * 기준 월(payMonth)에 대해 실제 정산 시작 날짜를 해석한다.
     * 예: 기준월 2026-06, startOffset=PREV_MONTH, startDay="01" → 2026-05-01.
     */
    public LocalDate resolveStart(YearMonth payMonth) {
        return resolveDate(payMonth, startOffset, startDay, false);
    }

    /** 기준 월에 대해 실제 정산 마감 날짜를 해석한다(말일이면 그 달 말일). */
    public LocalDate resolveEnd(YearMonth payMonth) {
        return resolveDate(payMonth, endOffset, endDay, Boolean.TRUE.equals(endLastDay));
    }

    /** 기준 월에 대해 실제 급여 지급 날짜를 해석한다(말일이면 그 달 말일). */
    public LocalDate resolvePayDate(YearMonth payMonth) {
        return resolveDate(payMonth, payOffset, payDay, Boolean.TRUE.equals(payDayLastDay));
    }

    private static LocalDate resolveDate(YearMonth payMonth, MonthOffset offset, String day, boolean lastDay) {
        if (payMonth == null || offset == null) {
            return null;
        }
        YearMonth target = payMonth.plusMonths(offset.getDelta());
        if (lastDay) {
            return target.atEndOfMonth();
        }
        if (day == null) {
            return null;
        }
        int d = Integer.parseInt(day);
        // 31일 지정인데 그 달이 더 짧으면(예: 2월) 말일로 클램프한다.
        int safeDay = Math.min(d, target.lengthOfMonth());
        return target.atDay(safeDay);
    }
}
