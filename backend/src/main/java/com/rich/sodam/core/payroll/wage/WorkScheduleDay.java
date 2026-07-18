package com.rich.sodam.core.payroll.wage;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * 요일별 근무 스케줄 1건(근로계약 약정) — 순수 값 객체.
 *
 * <p>야간(자정 넘김) 규칙은 기존 시프트 도메인과 동일: <b>종료 ≤ 시작이면 익일 종료</b>로
 * 해석한다(예: 20:00~05:00). 휴게 시각도 같은 규칙으로 근무 구간 위에 사상(寫像)한다 —
 * 휴게 시작이 출근 시각보다 이르면 익일, 휴게 종료 ≤ 휴게 시작이면 그다음으로 해석
 * (예: 근무 20:00~05:00 · 휴게 00:00~01:00).</p>
 *
 * <p>구조 검증(중복 요일·휴게가 근무 밖 등)은 {@link WorkScheduleCalculator#weeklyStats}가 수행한다.</p>
 *
 * @param day            근무 요일(시작일 기준 — 야간 시프트도 시작 요일로 귀속)
 * @param startTime      출근(시업) 시각
 * @param endTime        퇴근(종업) 시각. 시업 이하이면 익일로 해석
 * @param breakStartTime 휴게 시작(선택 — 없으면 휴게 없음, breakEndTime 과 쌍으로만 유효)
 * @param breakEndTime   휴게 종료(선택)
 */
public record WorkScheduleDay(
        DayOfWeek day,
        LocalTime startTime,
        LocalTime endTime,
        LocalTime breakStartTime,
        LocalTime breakEndTime
) {
}
