package com.rich.sodam.dto.response;

import java.util.List;

/**
 * {@code GET /api/attendance-credits/me} 응답(recruitment-monetization-gamification-plan.md §5).
 *
 * @param balance          현재 유효 잔액(만료분 lazy 반영 — DB 캐시 컬럼을 그대로 신뢰하지 않고 계산됨)
 * @param expiringThisWeek 이번 주(오늘부터 이번 주 마지막 날까지) 안에 소멸 예정인 수량
 * @param currentStreak    현재 연속 출석일수
 * @param checkedInToday   오늘 이미 출석체크를 완료했는지
 * @param weeklyGrid       이번 주 월~일 출석 그리드
 */
public record AttendanceCreditSummaryResponse(
        int balance,
        int expiringThisWeek,
        int currentStreak,
        boolean checkedInToday,
        List<AttendanceCreditWeekDayStatus> weeklyGrid
) {
}
