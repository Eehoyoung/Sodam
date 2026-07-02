package com.rich.sodam.personal.service;

import com.rich.sodam.personal.domain.PersonalAttendance;
import com.rich.sodam.personal.domain.PersonalWorkplace;
import com.rich.sodam.personal.dto.PersonalAnnualTaxDto;
import com.rich.sodam.personal.dto.PersonalAnnualTaxDto.WorkplaceIncome;
import com.rich.sodam.personal.repository.PersonalAttendanceRepository;
import com.rich.sodam.personal.repository.PersonalWorkplaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 긱워커 연간 사업소득·환급 신호 (B3/T-NEW-03).
 *
 * <p>근무지별 시급 × 근무시간으로 연간 소득을 합산하고 3.3% 기납부세액을 추정한다.
 * 환급은 홈택스/정부24 위임 — 집계·안내까지만.
 */
@Service
@RequiredArgsConstructor
public class PersonalTaxService {

    /** 사업소득 원천징수율 3.3%. */
    private static final double WITHHOLDING_RATE = 0.033;
    /** 데이터 OffsetDateTime 기준 — KST(+09:00). */
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    static final String GUIDANCE =
            "3.3% 떼인 사업소득은 5월 종합소득세 신고로 환급받을 수 있어요.";
    static final String DISCLAIMER =
            "추정 안내예요. 실제 환급액·신고는 홈택스·정부24에서 확인해 주세요.";

    private final PersonalAttendanceRepository attendanceRepository;
    private final PersonalWorkplaceRepository workplaceRepository;

    @Transactional(readOnly = true)
    public PersonalAnnualTaxDto annualSummary(Long userId, int year) {
        OffsetDateTime from = OffsetDateTime.of(year, 1, 1, 0, 0, 0, 0, KST);
        OffsetDateTime to = OffsetDateTime.of(year, 12, 31, 23, 59, 59, 0, KST);

        Map<Long, PersonalWorkplace> workplaceById = new HashMap<>();
        for (PersonalWorkplace w : workplaceRepository.findByUserId(userId)) {
            workplaceById.put(w.getId(), w);
        }

        Map<Long, long[]> incomeByWorkplace = new LinkedHashMap<>(); // [income]
        Map<Long, String> nameByWorkplace = new LinkedHashMap<>();

        for (PersonalAttendance a : attendanceRepository.findByUserIdAndCheckInAtBetween(userId, from, to)) {
            if (a.getWorkplaceId() == null || a.getDurationMinutes() == null) {
                continue;
            }
            PersonalWorkplace w = workplaceById.get(a.getWorkplaceId());
            if (w == null || w.getHourlyWage() == null) {
                continue;
            }
            long income = Math.round(a.getDurationMinutes() / 60.0 * w.getHourlyWage());
            incomeByWorkplace.computeIfAbsent(a.getWorkplaceId(), k -> new long[1])[0] += income;
            nameByWorkplace.putIfAbsent(a.getWorkplaceId(), w.getName());
        }

        List<WorkplaceIncome> perWorkplace = new ArrayList<>();
        long totalIncome = 0;
        for (Map.Entry<Long, long[]> e : incomeByWorkplace.entrySet()) {
            long income = e.getValue()[0];
            long withheld = Math.round(income * WITHHOLDING_RATE);
            perWorkplace.add(new WorkplaceIncome(e.getKey(), nameByWorkplace.get(e.getKey()), income, withheld));
            totalIncome += income;
        }

        long withheldEstimate = Math.round(totalIncome * WITHHOLDING_RATE);
        boolean refundPossible = withheldEstimate > 0;

        return new PersonalAnnualTaxDto(
                year, totalIncome, withheldEstimate, refundPossible, perWorkplace, GUIDANCE, DISCLAIMER);
    }
}
