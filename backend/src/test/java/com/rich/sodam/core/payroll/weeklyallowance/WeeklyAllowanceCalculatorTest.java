package com.rich.sodam.core.payroll.weeklyallowance;

import com.rich.sodam.core.payroll.weeklyallowance.strategy.FullTimeWeekdayWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.IneligibleWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.ShiftScheduleWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.ShortTimeWeeklyAllowanceCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 주휴수당 core 전략 단위 테스트.
 *
 * <p>법정 공식: 주휴시간 = min(1주 소정근로/40 × 8, 8) × 시급. 15h 미만 또는 미개근 시 0.
 * 노무 검증 보고서의 법정 케이스를 그대로 검증한다.</p>
 */
class WeeklyAllowanceCalculatorTest {

    private final WeeklyAllowanceCalculatorResolver resolver = new WeeklyAllowanceCalculatorResolver(List.of(
            new IneligibleWeeklyAllowanceCalculator(),
            new FullTimeWeekdayWeeklyAllowanceCalculator(),
            new ShortTimeWeeklyAllowanceCalculator(),
            new ShiftScheduleWeeklyAllowanceCalculator()
    ));

    private WeeklyAllowanceContext ctx(double weeklyHours, int hourlyWage, int scheduledDays, int workedDays, WeeklyWorkPattern pattern) {
        return new WeeklyAllowanceContext(
                BigDecimal.valueOf(hourlyWage),
                BigDecimal.valueOf(weeklyHours),
                scheduledDays,
                workedDays,
                pattern
        );
    }

    // ===== 법정 공식 정확성 =====

    @Test
    void 풀타임_주40시간_개근이면_8시간분_주휴() {
        // 주 40h(8h×5일), 시급 10,030 → 8 × 10,030 = 80,240
        WeeklyAllowanceResult r = resolver.resolve(ctx(40, 10_030, 5, 5, WeeklyWorkPattern.AUTO));
        assertEquals(80_240, r.amountAsInt());
        assertEquals("FULLTIME_WEEKDAY", r.strategyName());
    }

    @Test
    void 풀타임_주40시간_초과근무여도_상한_8시간() {
        // 주 48h(연장 포함) → 상한 8h 로 고정. 80,240 동일
        WeeklyAllowanceResult r = resolver.resolve(ctx(48, 10_030, 6, 6, WeeklyWorkPattern.AUTO));
        assertEquals(80_240, r.amountAsInt());
    }

    @Test
    void 단시간_주20시간_비례_4시간분_주휴() {
        // 주 20h → 20/40 × 8 = 4h × 10,030 = 40,120
        WeeklyAllowanceResult r = resolver.resolve(ctx(20, 10_030, 5, 5, WeeklyWorkPattern.AUTO));
        assertEquals(40_120, r.amountAsInt());
        assertEquals("SHORT_TIME", r.strategyName());
    }

    @Test
    void 단시간_주15시간_경계_지급발생() {
        // 정확히 15h → 발생. 15/40 × 8 = 3h × 10,030 = 30,090
        WeeklyAllowanceResult r = resolver.resolve(ctx(15, 10_030, 3, 3, WeeklyWorkPattern.AUTO));
        assertEquals(30_090, r.amountAsInt());
        assertEquals("SHORT_TIME", r.strategyName());
    }

    @Test
    void 주15시간_미만_미발생_0원() {
        WeeklyAllowanceResult r = resolver.resolve(ctx(14, 10_030, 3, 3, WeeklyWorkPattern.AUTO));
        assertEquals(0, r.amountAsInt());
        assertEquals("INELIGIBLE", r.strategyName());
    }

    @Test
    void 미개근이면_시간충족해도_0원() {
        // 소정 5일 중 4일만 출근 → 미개근
        WeeklyAllowanceResult r = resolver.resolve(ctx(40, 10_030, 5, 4, WeeklyWorkPattern.AUTO));
        assertEquals(0, r.amountAsInt());
        assertEquals("INELIGIBLE", r.strategyName());
    }

    // ===== 구 로직(평균일급 × 0.2) 회귀 방지 =====

    @Test
    void 구로직_과소지급_회귀방지_주40시간은_8시간분이어야() {
        // 구 버그: 평균일급(8h×시급) × 0.2 = 1.6h × 시급 = 16,048 (법정의 20%)
        // 신 로직: 8h × 시급 = 80,240 이어야 함
        WeeklyAllowanceResult r = resolver.resolve(ctx(40, 10_030, 5, 5, WeeklyWorkPattern.AUTO));
        assertNotEquals(16_048, r.amountAsInt(), "구 1/5 축소 버그가 재발하면 안 됨");
        assertEquals(80_240, r.amountAsInt());
    }

    // ===== 전략 선택/경계 =====

    @Test
    void 경계_정확히_40시간은_풀타임_전략() {
        WeeklyAllowanceResult r = resolver.resolve(ctx(40, 10_030, 5, 5, WeeklyWorkPattern.AUTO));
        assertEquals("FULLTIME_WEEKDAY", r.strategyName());
    }

    @Test
    void 교대근무_지정시_shift_전략_우선() {
        // 교대 30h → SHIFT_SCHEDULE 전략(priority 60)이 ShortTime(40)보다 우선
        WeeklyAllowanceResult r = resolver.resolve(ctx(30, 10_030, 4, 4, WeeklyWorkPattern.SHIFT_SCHEDULE));
        assertEquals("SHIFT_SCHEDULE", r.strategyName());
        // 30/40 × 8 = 6h × 10,030 = 60,180
        assertEquals(60_180, r.amountAsInt());
    }

    @Test
    void scheduledDays_미상_0이면_출근1일이상은_개근간주() {
        // scheduledDays=0(미상), workedDays=3 → 개근 간주 → 단시간 지급
        WeeklyAllowanceResult r = resolver.resolve(ctx(20, 10_030, 0, 3, WeeklyWorkPattern.AUTO));
        assertEquals("SHORT_TIME", r.strategyName());
        assertEquals(40_120, r.amountAsInt());
    }

    // ===== WeekStartPolicy =====

    @Test
    void 주기산_월요일_고정() {
        // 2026-06-03(수) → 그 주 월요일 2026-06-01
        LocalDate ws = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 6, 3), null);
        assertEquals(LocalDate.of(2026, 6, 1), ws);
    }

    @Test
    void 주기산_일요일_고정() {
        // 2026-06-03(수) → 그 주 일요일 2026-05-31
        LocalDate ws = WeekStartPolicy.SUNDAY.weekStartOf(LocalDate.of(2026, 6, 3), null);
        assertEquals(LocalDate.of(2026, 5, 31), ws);
    }

    @Test
    void 주기산_입사일기준_7일회전() {
        // 입사일 2026-06-01(월), 근무일 2026-06-10 → 9일 경과 → 1주차 시작 2026-06-08
        LocalDate hire = LocalDate.of(2026, 6, 1);
        LocalDate ws = WeekStartPolicy.HIRE_DATE_ANCHORED.weekStartOf(LocalDate.of(2026, 6, 10), hire);
        assertEquals(LocalDate.of(2026, 6, 8), ws);
    }

    @Test
    void 주기산_입사일기준_앵커없으면_월요일_폴백() {
        LocalDate ws = WeekStartPolicy.HIRE_DATE_ANCHORED.weekStartOf(LocalDate.of(2026, 6, 3), null);
        assertEquals(LocalDate.of(2026, 6, 1), ws);
    }

    // ===== 월 경계 귀속 규칙 (주 종료일이 속한 월에 전액 귀속, 분할 금지) =====

    /**
     * 월경계 주의 귀속 판정 로직을 재현한 헬퍼.
     * 실제 PayrollService.calculateTotalWeeklyAllowance 와 동일한 규칙:
     * 주 종료일(weekStart+6)이 정산월 [monthStart, monthEnd] 안이면 그 달 귀속.
     */
    private boolean belongsToMonth(LocalDate weekStart, LocalDate monthStart, LocalDate monthEnd) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return !weekEnd.isBefore(monthStart) && !weekEnd.isAfter(monthEnd);
    }

    @Test
    void 월경계주_종료일이_익월이면_당월에서_제외() {
        // 주 2026-05-25(월)~05-31(일). 종료일 05-31 → 5월 귀속, 6월엔 제외
        LocalDate weekStart = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 5, 27), null);
        assertEquals(LocalDate.of(2026, 5, 25), weekStart);
        assertTrue(belongsToMonth(weekStart, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 31)));
        assertFalse(belongsToMonth(weekStart, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30)));
    }

    @Test
    void 월경계주_종료일이_당월이면_전월출근_포함해_당월귀속() {
        // 주 2026-06-01(월)~06-07(일). 종료일 06-07 → 6월 귀속. (5월30~31 출근이 같은 주에 있어도 6월에 전액)
        LocalDate weekStart = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 6, 3), null);
        assertEquals(LocalDate.of(2026, 6, 1), weekStart);
        assertTrue(belongsToMonth(weekStart, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30)));
        assertFalse(belongsToMonth(weekStart, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 31)));
    }

    @Test
    void 월경계주_중복귀속_없음() {
        // 한 주는 5월·6월 중 정확히 한 달에만 귀속 (종료일 기준 단일 귀속)
        LocalDate weekStart = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 5, 28), null); // 5/25~5/31
        boolean inMay = belongsToMonth(weekStart, LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 31));
        boolean inJun = belongsToMonth(weekStart, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30));
        assertTrue(inMay ^ inJun, "주는 정확히 한 달에만 귀속되어야 함 (중복/누락 금지)");
    }
}
