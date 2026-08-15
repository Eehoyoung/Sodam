package com.rich.sodam.service;

import com.rich.sodam.config.LaborLawRoadmapProperties;
import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.constant.StatutoryHeadcountStandards;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.dto.response.HeadcountSimulationResponse;
import com.rich.sodam.dto.response.StatutoryHeadcountResponse;
import com.rich.sodam.dto.response.StatutoryHeadcountResponse.RoadmapItem;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 근로기준법 시행령 §7의2 상시근로자 수 참고 산정기(사장 전용, 신규 테이블 없음).
 *
 * <p><b>⚠️ {@code EmploymentCreditService}(통합고용세액공제 상시근로자 집계)와 산식이 다르다.</b>
 * 그 서비스는 "그 달 출근 기록이 있는 직원의 distinct 수"를 쓰지만, 근로기준법 시행령 §7의2는
 * "산정기간(사유 발생일 전 1개월) 중 사용한 근로자 연인원 ÷ 같은 기간 가동일수"로 값이 다르다
 * (예: 알바 4명이 주 2일씩 근무 → distinct 4명 vs 이 서비스의 산정 약 1.6명). 두 산식을 섞으면
 * 세액공제 신호와 근로기준법 적용 판정이 뒤바뀌는 오판이 나고, 그 오판은 사장의 채용 의사결정을
 * 바꾼다. 이 서비스는 {@code EmploymentCreditService}의 집계 로직을 재사용하지 않는다.
 *
 * <p>판정은 전부 참고용이다(HC-3) — 다른 기능을 자동으로 켜거나 끄지 않는다(HC-4).
 */
@Service
@RequiredArgsConstructor
public class StatutoryHeadcountService {

    static final String DISCLAIMER =
            "근로기준법 시행령 §7의2 방식의 참고 산정이에요. 최종 판단은 근로감독관·법원의 권한입니다.";

    private final StoreRepository storeRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final LaborLawRoadmapProperties roadmapProperties;

    @Transactional(readOnly = true)
    public StatutoryHeadcountResponse referenceHeadcount(Long storeId) {
        return referenceHeadcount(storeId, LocalDate.now());
    }

    /** 기준일 주입 가능 버전(테스트용). */
    @Transactional(readOnly = true)
    public StatutoryHeadcountResponse referenceHeadcount(Long storeId, LocalDate today) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));

        LocalDate periodEnd = today.minusDays(1);
        LocalDate periodStart = today.minusMonths(StatutoryHeadcountStandards.CALCULATION_PERIOD_MONTHS);

        Map<LocalDate, Set<Long>> dailyEmployees = dailyDistinctEmployees(store, periodStart, periodEnd);
        int operatingDays = dailyEmployees.size();
        int manDays = dailyEmployees.values().stream().mapToInt(Set::size).sum();
        BigDecimal statutoryHeadcount = operatingDays == 0
                ? BigDecimal.ZERO.setScale(StatutoryHeadcountStandards.SCALE, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(manDays)
                        .divide(BigDecimal.valueOf(operatingDays), StatutoryHeadcountStandards.SCALE, RoundingMode.HALF_UP);
        boolean meetsThreshold = statutoryHeadcount.compareTo(StatutoryHeadcountStandards.THRESHOLD) >= 0;

        return new StatutoryHeadcountResponse(storeId, periodStart, periodEnd, operatingDays, manDays,
                statutoryHeadcount, meetsThreshold, roadmap(), DISCLAIMER);
    }

    @Transactional(readOnly = true)
    public HeadcountSimulationResponse simulateAddingEmployees(Long storeId, int additionalEmployees) {
        return simulateAddingEmployees(storeId, additionalEmployees, LocalDate.now());
    }

    /** 기준일 주입 가능 버전(테스트용). */
    @Transactional(readOnly = true)
    public HeadcountSimulationResponse simulateAddingEmployees(Long storeId, int additionalEmployees, LocalDate today) {
        if (additionalEmployees < 1) {
            throw new IllegalArgumentException("추가 채용 인원은 1명 이상이어야 해요.");
        }
        StatutoryHeadcountResponse current = referenceHeadcount(storeId, today);

        // 신규 채용 인원이 매 가동일 근무한다고 가정(보수적 최대치 — "가능성"을 알리는 참고 시뮬레이션).
        BigDecimal projected = current.statutoryHeadcount().add(BigDecimal.valueOf(additionalEmployees));
        boolean crossesThreshold = !current.meetsThreshold()
                && projected.compareTo(StatutoryHeadcountStandards.THRESHOLD) >= 0;

        List<String> provisions = crossesThreshold
                ? StatutoryHeadcountStandards.NEWLY_APPLICABLE_PROVISIONS
                : List.of();

        BigDecimal avgWage = averageAppliedHourlyWage(storeId, today);
        int additional = additionalEmployees;
        BigDecimal min = avgWage
                .multiply(StatutoryHeadcountStandards.SIMULATION_MONTHLY_HOURS_LOW)
                .multiply(BigDecimal.valueOf(additional))
                .setScale(0, RoundingMode.HALF_UP);
        BigDecimal max = avgWage
                .multiply(StatutoryHeadcountStandards.SIMULATION_MONTHLY_HOURS_HIGH)
                .multiply(BigDecimal.valueOf(additional))
                .setScale(0, RoundingMode.HALF_UP);

        return new HeadcountSimulationResponse(storeId, current.statutoryHeadcount(), additionalEmployees,
                projected, crossesThreshold, provisions, min, max, DISCLAIMER);
    }

    /** 산정기간 내 일자별 실제 출근(체크인) 직원 distinct 집합. 가동일수·연인원 산출의 기초 자료. */
    private Map<LocalDate, Set<Long>> dailyDistinctEmployees(Store store, LocalDate periodStart, LocalDate periodEnd) {
        LocalDateTime from = periodStart.atStartOfDay();
        LocalDateTime to = periodEnd.plusDays(1).atStartOfDay();
        Map<LocalDate, Set<Long>> byDay = new HashMap<>();
        for (Attendance att : attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(store, from, to)) {
            if (att.getCheckInTime() == null || att.getEmployeeProfile() == null
                    || att.getEmployeeProfile().getId() == null) {
                continue;
            }
            LocalDate day = att.getCheckInTime().toLocalDate();
            if (day.isBefore(periodStart) || day.isAfter(periodEnd)) {
                continue;
            }
            byDay.computeIfAbsent(day, k -> new HashSet<>()).add(att.getEmployeeProfile().getId());
        }
        return byDay;
    }

    /** 재직 중인 직원의 평균 적용 시급. 재직자가 없으면 해당 연도 최저임금으로 대체(보수적 하한). */
    private BigDecimal averageAppliedHourlyWage(Long storeId, LocalDate today) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));
        List<EmployeeStoreRelation> relations = relationRepository.findByStoreAndIsActiveTrue(store);
        if (relations.isEmpty()) {
            return MinimumWage.hourlyFor(today.getYear());
        }
        long sum = 0;
        for (EmployeeStoreRelation rel : relations) {
            sum += rel.getAppliedHourlyWage();
        }
        return BigDecimal.valueOf(sum)
                .divide(BigDecimal.valueOf(relations.size()), 0, RoundingMode.HALF_UP);
    }

    private List<RoadmapItem> roadmap() {
        return roadmapProperties.getItems().stream()
                .map(item -> new RoadmapItem(item.getStage(), item.getExpectedYear(), item.getTitle(), item.getDescription()))
                .toList();
    }
}
