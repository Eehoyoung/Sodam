package com.rich.sodam.dto.response;

/**
 * {@code POST /api/attendance-credits/check-in} 응답(recruitment-monetization-gamification-plan.md §5).
 *
 * @param grantedQuantity      오늘 지급된 기본 수량(요일별 3 또는 5, 설정값)
 * @param streakBonusGranted   7일 연속 출석 보너스가 이번 체크인으로 함께 지급됐는지
 * @param streakBonusQuantity  보너스 지급 수량(미지급 시 0)
 * @param balance              체크인 반영 후 잔액
 * @param currentStreak        체크인 반영 후 연속 출석일수
 */
public record AttendanceCreditCheckInResponse(
        int grantedQuantity,
        boolean streakBonusGranted,
        int streakBonusQuantity,
        int balance,
        int currentStreak
) {
}
