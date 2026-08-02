package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * {@code GET /api/attendance-credits/me} 응답의 이번 주(월~일) 출석 그리드 한 칸.
 *
 * @param date       해당 날짜
 * @param dayOfWeek  "MON".."SUN"
 * @param checkedIn  해당 날짜에 출석체크를 완료했는지
 * @param isToday    오늘 날짜인지(FE 강조 표시용)
 */
public record AttendanceCreditWeekDayStatus(
        LocalDate date,
        String dayOfWeek,
        boolean checkedIn,
        boolean isToday
) {
}
