package com.rich.sodam.service;

import com.rich.sodam.dto.response.PayrollBoundaryAdvisoryResponse;
import com.rich.sodam.dto.response.PayrollBoundaryAdvisoryResponse.BoundaryWeek;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

/**
 * 주휴 월경계 정합성 알림 (L-NEW-06). 월 경계에 걸친 주(월~일)를 식별해 사장에게 확인을 권한다.
 *
 * <p>순수 날짜 계산(저장 없음). 주휴 자동산정이 경계 주에서 부정확할 수 있다는 안내·면책.
 */
@Service
public class PayrollAdvisoryService {

    static final String ADVISORY =
            "월 경계에 걸친 주는 주휴수당 귀속이 모호할 수 있어요. 이 주들은 노무사 확인을 권장해요(참고용 안내).";

    public PayrollBoundaryAdvisoryResponse monthBoundaryWeeks(int year, int month) {
        LocalDate firstDay = LocalDate.of(year, month, 1);
        LocalDate lastDay = firstDay.with(TemporalAdjusters.lastDayOfMonth());

        List<BoundaryWeek> weeks = new ArrayList<>();

        // 1일이 속한 주(월~일) — 월요일이 전월이면 경계
        LocalDate firstWeekStart = firstDay.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate firstWeekEnd = firstWeekStart.plusDays(6);
        if (firstWeekStart.isBefore(firstDay)) {
            weeks.add(new BoundaryWeek(firstWeekStart, firstWeekEnd, true,
                    firstWeekEnd.isAfter(lastDay)));
        }

        // 말일이 속한 주 — 일요일이 다음달이면 경계(첫 주와 다른 주일 때만 추가)
        LocalDate lastWeekStart = lastDay.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate lastWeekEnd = lastWeekStart.plusDays(6);
        if (lastWeekEnd.isAfter(lastDay) && !lastWeekStart.isEqual(firstWeekStart)) {
            weeks.add(new BoundaryWeek(lastWeekStart, lastWeekEnd,
                    lastWeekStart.isBefore(firstDay), true));
        }

        return new PayrollBoundaryAdvisoryResponse(year, month, weeks, !weeks.isEmpty(), ADVISORY);
    }
}
