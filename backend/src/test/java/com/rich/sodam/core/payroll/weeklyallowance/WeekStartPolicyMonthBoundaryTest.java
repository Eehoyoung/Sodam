package com.rich.sodam.core.payroll.weeklyallowance;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 주(週) 기산이 <b>월 경계를 넘어갈 때</b> 어떻게 동작하는지를 고정하는 테스트.
 *
 * <p>배경: 급여 정산({@code PayrollService.calculateTotalWeeklyAllowance})은 "주 종료일이 속한 달에
 * 그 주의 주휴수당을 전액 귀속(분할·중복 금지)"하는 규칙을 쓴다. 그 규칙의 기반이 이 클래스의
 * {@code weekStartOf} 인데, 월 경계 케이스를 직접 검증하는 테스트가 없었다
 * ({@code .claude/rules/testing.md} 가 요구하는 "월말일 정산주기" 경계값 테스트 공백).</p>
 *
 * <p>기준 달력: 2026-07-27(월) ~ 2026-08-02(일) 이 월 경계에 걸친 주다.</p>
 */
class WeekStartPolicyMonthBoundaryTest {

    // 2026-07-27(월) ~ 2026-08-02(일) — 근무일은 전부 7월, 주 종료일만 8월
    private static final LocalDate BOUNDARY_WEEK_MON = LocalDate.of(2026, 7, 27);
    private static final LocalDate BOUNDARY_WEEK_SUN = LocalDate.of(2026, 8, 2);

    // ===== MONDAY (운영 기본값) =====

    @Test
    @DisplayName("MONDAY: 월 경계에 걸친 주는 전월 근무일도 같은 주(週)로 묶인다")
    void monday_경계주는_전월_근무일도_같은_주로_묶인다() {
        // 7/27(월)~7/31(금) 은 전부 7월이지만, 주 시작은 모두 7/27 로 동일해야 한다
        for (int day = 27; day <= 31; day++) {
            assertEquals(BOUNDARY_WEEK_MON,
                    WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 7, day), null),
                    "7/" + day + " 의 주 시작이 7/27 이 아니다");
        }
        // 8/1(토)·8/2(일) 도 같은 주다 — 달이 바뀌어도 주는 안 끊긴다
        assertEquals(BOUNDARY_WEEK_MON, WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 8, 1), null));
        assertEquals(BOUNDARY_WEEK_MON, WeekStartPolicy.MONDAY.weekStartOf(BOUNDARY_WEEK_SUN, null));
    }

    @Test
    @DisplayName("MONDAY: 경계주의 종료일은 8월이다 — 귀속월 판정의 근거")
    void monday_경계주_종료일은_8월이다() {
        LocalDate weekEnd = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 7, 31), null).plusDays(6);

        assertEquals(BOUNDARY_WEEK_SUN, weekEnd);
        assertEquals(8, weekEnd.getMonthValue(),
                "주 종료일이 8월이어야 이 주가 8월 정산에 귀속된다");
    }

    @Test
    @DisplayName("MONDAY: 다음 주는 8/3(월)부터 — 경계주와 겹치지 않는다(중복 귀속 방지)")
    void monday_경계주와_다음주는_겹치지_않는다() {
        LocalDate nextWeekStart = WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 8, 3), null);

        assertEquals(LocalDate.of(2026, 8, 3), nextWeekStart);
        assertTrue(nextWeekStart.isAfter(BOUNDARY_WEEK_SUN),
                "다음 주 시작이 경계주 종료일보다 뒤여야 같은 날이 두 주에 중복 집계되지 않는다");
    }

    // ===== SUNDAY =====

    @Test
    @DisplayName("SUNDAY: 기산이 바뀌면 경계주의 귀속월도 바뀐다")
    void sunday_기산이_바뀌면_귀속월도_바뀐다() {
        // 일요일 기산에서 7/31(금)이 속한 주는 7/26(일)~8/1(토)
        LocalDate weekStart = WeekStartPolicy.SUNDAY.weekStartOf(LocalDate.of(2026, 7, 31), null);
        LocalDate weekEnd = weekStart.plusDays(6);

        assertEquals(LocalDate.of(2026, 7, 26), weekStart);
        assertEquals(LocalDate.of(2026, 8, 1), weekEnd);
        // MONDAY 든 SUNDAY 든 이 주는 8월 귀속이지만, 주에 포함되는 근무일 집합이 다르다
        assertEquals(8, weekEnd.getMonthValue());
    }

    // ===== HIRE_DATE_ANCHORED =====

    @Test
    @DisplayName("HIRE_DATE_ANCHORED: 입사일 요일로 7일 회전하므로 경계주 자체가 달라진다")
    void 입사일기산_경계주가_달라진다() {
        LocalDate hireDate = LocalDate.of(2026, 7, 1); // 수요일

        LocalDate weekStart = WeekStartPolicy.HIRE_DATE_ANCHORED.weekStartOf(LocalDate.of(2026, 7, 31), hireDate);

        // 7/1 기준 7일 회전: 7/1, 7/8, 7/15, 7/22, 7/29 ... → 7/31 은 7/29 시작 주
        assertEquals(LocalDate.of(2026, 7, 29), weekStart);
        assertEquals(LocalDate.of(2026, 8, 4), weekStart.plusDays(6),
                "MONDAY 정책(8/2 종료)과 종료일이 다르다 — 같은 근무기록도 정책에 따라 귀속월이 갈릴 수 있다");
    }

    @Test
    @DisplayName("HIRE_DATE_ANCHORED: 입사일이 없으면 MONDAY 로 폴백한다")
    void 입사일기산_입사일_null_이면_MONDAY_폴백() {
        assertEquals(
                WeekStartPolicy.MONDAY.weekStartOf(LocalDate.of(2026, 7, 31), null),
                WeekStartPolicy.HIRE_DATE_ANCHORED.weekStartOf(LocalDate.of(2026, 7, 31), null));
    }

    // ===== STORE_DEFINED — 현재 구현 상태를 고정 =====

    @Test
    @DisplayName("STORE_DEFINED: 현재는 MONDAY 와 동일하게 동작한다(RELEASE_GATES T-8)")
    void store_defined_는_현재_MONDAY_와_동일하다() {
        // ⚠️ 이 테스트는 "이래야 한다"가 아니라 "지금 이렇다"를 고정한 것이다.
        //    STORE_DEFINED 는 이름과 달리 사업장 설정을 전혀 참조하지 않는다 — Store 엔티티에
        //    기산 요일 필드 자체가 없다. RELEASE_GATES.md T-8 로 등재돼 있으며, G-7(노무사 서면확인)
        //    해소 시 이 동작이 바뀐다. 그때 이 테스트는 함께 고쳐야 한다.
        for (int day = 27; day <= 31; day++) {
            LocalDate d = LocalDate.of(2026, 7, day);
            assertEquals(WeekStartPolicy.MONDAY.weekStartOf(d, null),
                    WeekStartPolicy.STORE_DEFINED.weekStartOf(d, null));
        }
    }
}
