package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.HeadcountTrendResponse;
import com.rich.sodam.dto.response.HeadcountTrendResponse.MonthCount;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 통합고용세액공제 상시근로자 월별 증빙 (A3/T-NEW-02).
 *
 * <p>월별 상시근로자 수 = 그 달 출근 기록이 있는 직원의 distinct 수(추정). 평균을 전년과 비교해
 * 고용 증가(공제 가능) 신호를 낸다. 출근 데이터(NFC+GPS)는 소담만 가진 입증 자료.
 */
@Service
@RequiredArgsConstructor
public class EmploymentCreditService {

    static final String DISCLAIMER =
            "출근 데이터 기반 추정이에요. 통합고용세액공제 적용·상시근로자 산정은 세무사 검토가 필요해요.";

    private final AttendanceRepository attendanceRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public HeadcountTrendResponse headcountTrend(Long storeId, int year) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));

        List<MonthCount> monthly = monthlyCounts(store, year);
        double average = average(monthly);
        double priorAverage = average(monthlyCounts(store, year - 1));
        boolean increased = average > priorAverage;

        return new HeadcountTrendResponse(
                storeId, year, monthly, round1(average), round1(priorAverage), increased, DISCLAIMER);
    }

    private List<MonthCount> monthlyCounts(Store store, int year) {
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year, 12, 31).atTime(23, 59, 59);
        List<Attendance> rows =
                attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(store, start, end);

        Map<Integer, Set<Long>> byMonth = new HashMap<>();
        for (Attendance a : rows) {
            if (a.getCheckInTime() == null || a.getEmployeeProfile() == null
                    || a.getEmployeeProfile().getId() == null) {
                continue;
            }
            int month = a.getCheckInTime().getMonthValue();
            byMonth.computeIfAbsent(month, k -> new HashSet<>()).add(a.getEmployeeProfile().getId());
        }

        List<MonthCount> out = new ArrayList<>(12);
        for (int m = 1; m <= 12; m++) {
            out.add(new MonthCount(m, byMonth.getOrDefault(m, Set.of()).size()));
        }
        return out;
    }

    private double average(List<MonthCount> monthly) {
        return monthly.stream().mapToInt(MonthCount::headcount).sum() / 12.0;
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
