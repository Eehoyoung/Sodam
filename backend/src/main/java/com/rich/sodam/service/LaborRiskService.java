package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.constant.MinorLaborStandards;
import com.rich.sodam.core.payroll.constant.StatutoryHeadcountStandards;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.LaborInfoRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 노무 리스크 대시보드 — 기존 데이터(확정 시프트·출퇴근·근로계약서·시급·입사일)만 재사용해
 * 매장의 잠재 노무 리스크를 한 번에 수집한다(사장 전용, 신규 테이블 없음).
 *
 * <p>수집 항목:
 * <ol>
 *   <li>WEEKLY_15H_BOUNDARY — 이번 주 확정 시프트 합계 13~17h(주휴수당 15h 경계, WARN)</li>
 *   <li>WEEKLY_52H_NEAR — 이번 주 실근무(오늘 이전)+확정 시프트(오늘 이후) 합계 48h 이상(WARN)</li>
 *   <li>CONTRACT_UNSIGNED — 근로계약서 없음/미서명(§17 위반 가능, DANGER)</li>
 *   <li>MIN_WAGE_RISK — 적용 시급 현행 최저임금 미만(DANGER) / 차기년도 고시 미만(WARN)</li>
 *   <li>SEVERANCE_UPCOMING — 입사 11개월 이상 경과 = 퇴직금 채권 발생 임박(WARN)</li>
 * </ol>
 * 매장 소유 검증은 컨트롤러(StoreAccessGuard)에서 수행.
 */
@Service
@RequiredArgsConstructor
public class LaborRiskService {

    /** 주휴수당 15h 경계 구간 하한/상한(시간). */
    private static final BigDecimal BOUNDARY_LOW = new BigDecimal("13");
    private static final BigDecimal BOUNDARY_HIGH = new BigDecimal("17");
    /** 주 52시간 한도 임박 판정 기준(시간). */
    private static final BigDecimal NEAR_52H_THRESHOLD = new BigDecimal("48");
    /** 퇴직금 채권 발생(1년 근속) 임박 판정 — 입사 후 경과 개월 수. */
    private static final long SEVERANCE_WARN_MONTHS = 11;
    /** 주 연장근로 법정 한도(§53) — 초과 약정 계약은 대시보드 경고. */
    private static final double MAX_WEEKLY_OVERTIME_HOURS = 12.0;
    /** (WP-2) 다음 주 예측 — 주 52시간 초과 예상 판정 기준(시간). */
    private static final BigDecimal FORECAST_52H_THRESHOLD = new BigDecimal("52");
    /** (WP-2) 다음 주 예측 — 휴게시간 배치가 필요해지는 근무 하한(4h→30분, 8h→1h). */
    private static final BigDecimal BREAK_REQUIRED_AT_4H = new BigDecimal("4");
    private static final BigDecimal BREAK_REQUIRED_AT_8H = new BigDecimal("8");
    private static final BigDecimal MINOR_DAILY_FORECAST_LIMIT = BigDecimal.valueOf(MinorLaborStandards.DAILY_HOUR_LIMIT);
    private static final BigDecimal MINOR_WEEKLY_FORECAST_LIMIT = BigDecimal.valueOf(MinorLaborStandards.WEEKLY_HOUR_LIMIT);

    /**
     * 52h 계열 중복 억제 우선순위(높은 우선순위 먼저) — 같은 직원에게 2개 이상 뜨면 1건만 남긴다.
     * CONTRACT_OVER_52H(계약 약정) &gt; SCHEDULE_52H_FORECAST(다음 주 예측) &gt; WEEKLY_52H_NEAR(이번 주 임박).
     */
    private static final List<RiskType> FIFTY_TWO_HOUR_FAMILY_PRIORITY =
            List.of(RiskType.CONTRACT_OVER_52H, RiskType.SCHEDULE_52H_FORECAST, RiskType.WEEKLY_52H_NEAR);

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final WorkShiftRepository workShiftRepository;
    private final AttendanceRepository attendanceRepository;
    private final LaborContractRepository laborContractRepository;
    private final LaborInfoRepository laborInfoRepository;
    private final StatutoryHeadcountService statutoryHeadcountService;
    private final MinorLaborGuardService minorLaborGuardService;
    private final LaborRiskNarrator laborRiskNarrator;

    @Transactional(readOnly = true)
    public LaborRiskResponse analyze(Long storeId) {
        return analyze(storeId, LocalDate.now());
    }

    /** 기준일 주입 가능 버전(테스트용). 주 단위는 월~일. */
    @Transactional(readOnly = true)
    public LaborRiskResponse analyze(Long storeId, LocalDate today) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));
        List<EmployeeStoreRelation> relations = relationRepository.findByStoreAndIsActiveTrue(store);
        if (relations.isEmpty()) {
            return new LaborRiskResponse(List.of());
        }

        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDate nextWeekStart = weekStart.plusWeeks(1);
        LocalDate nextWeekEnd = nextWeekStart.plusDays(6);

        // (WP-2) 다음 주 확정 시프트 — 사전 예측용, 직원별 시프트 목록 그대로 보관(일자별 판정에 필요).
        Map<Long, List<WorkShift>> nextWeekShiftsByEmployee = new HashMap<>();
        for (WorkShift shift : workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(storeId, nextWeekStart, nextWeekEnd)) {
            nextWeekShiftsByEmployee.computeIfAbsent(shift.getEmployeeId(), k -> new ArrayList<>()).add(shift);
        }

        // 이번 주 확정 시프트 — 직원별 (전체 합계) / (오늘 이후 합계) 두 가지로 집계
        Map<Long, BigDecimal> weekShiftHours = new HashMap<>();
        Map<Long, BigDecimal> upcomingShiftHours = new HashMap<>();
        for (WorkShift shift : workShiftRepository
                .findByStoreIdAndShiftDateBetweenAndConfirmedAtIsNotNullOrderByShiftDateAsc(storeId, weekStart, weekEnd)) {
            BigDecimal hours = shiftHours(shift);
            weekShiftHours.merge(shift.getEmployeeId(), hours, BigDecimal::add);
            if (!shift.getShiftDate().isBefore(today)) {
                upcomingShiftHours.merge(shift.getEmployeeId(), hours, BigDecimal::add);
            }
        }

        // 이번 주 실근무(퇴근 완료분, 오늘 이전 출근) — 직원별 합계
        Map<Long, BigDecimal> actualHours = new HashMap<>();
        for (Attendance att : attendanceRepository.findByStoreAndCheckInTimeBetweenOrderByCheckInTimeDesc(
                store, weekStart.atStartOfDay(), weekEnd.plusDays(1).atStartOfDay())) {
            if (att.getCheckOutTime() == null) continue;
            if (!att.getCheckInTime().toLocalDate().isBefore(today)) continue; // 오늘 이후는 시프트로 집계
            BigDecimal hours = BigDecimal.valueOf(
                            Duration.between(att.getCheckInTime(), att.getCheckOutTime()).toMinutes())
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
            actualHours.merge(att.getEmployeeProfile().getId(), hours, BigDecimal::add);
        }

        // 차기년도 최저임금 고시(노무정보) — 있으면 사전 경고에 사용
        Integer nextYearMinWage = laborInfoRepository
                .findFirstByYearAndMinimumWageIsNotNullOrderByIdDesc(today.getYear() + 1)
                .map(LaborInfo::getMinimumWage)
                .orElse(null);
        BigDecimal currentMinWage = MinimumWage.hourlyFor(today.getYear());

        // 근로계약서 — 매장 전체를 한 번에 조회 후 직원별 최신 1건만 취한다(N+1 방지).
        Map<Long, LaborContract> latestContractByEmployeeId = new HashMap<>();
        for (LaborContract contract : laborContractRepository.findByStoreIdOrderByEmployeeIdAscCreatedAtDesc(storeId)) {
            latestContractByEmployeeId.putIfAbsent(contract.getEmployeeId(), contract);
        }

        List<Item> items = new ArrayList<>();
        for (EmployeeStoreRelation rel : relations) {
            Long employeeId = rel.getEmployeeProfile().getId();
            String name = employeeName(rel);

            collectWeeklyHoursRisks(items, employeeId, name,
                    weekShiftHours.getOrDefault(employeeId, BigDecimal.ZERO),
                    actualHours.getOrDefault(employeeId, BigDecimal.ZERO)
                            .add(upcomingShiftHours.getOrDefault(employeeId, BigDecimal.ZERO)));
            collectContractRisk(items, employeeId, name,
                    Optional.ofNullable(latestContractByEmployeeId.get(employeeId)));
            collectMinWageRisk(items, employeeId, name, rel, currentMinWage, nextYearMinWage, today.getYear());
            collectSeveranceRisk(items, employeeId, name, rel, today);
            collectForecastRisks(items, employeeId, name, rel,
                    nextWeekShiftsByEmployee.getOrDefault(employeeId, List.of()), today);
        }
        collectHeadcountThresholdRisk(items, storeId, today);
        dedupe52hFamily(items);
        return new LaborRiskResponse(narrate(items));
    }

    /**
     * (WP-4) 표현 계층 위임 — 판정(RiskType·Severity·value)은 이미 확정된 뒤이며 메시지 문구만
     * {@link LaborRiskNarrator}를 거친다. 기본 빈({@link TemplateLaborRiskNarrator})은 문구를
     * 그대로 반환해(외부 호출 0) 이 매핑이 기존 동작을 바꾸지 않는다.
     */
    private List<Item> narrate(List<Item> items) {
        return items.stream()
                .map(i -> new Item(i.type(), i.severity(), i.employeeId(), i.employeeName(),
                        laborRiskNarrator.narrate(i), i.value()))
                .toList();
    }

    /**
     * (WP-2) 사후 감지 → 사전 예측 — 다음 주 확정 시프트만으로 실제 근무 전에 미리 계산한다
     * (실근무 데이터 불요). SCHEDULE_52H_FORECAST·SCHEDULE_15H_SHORTFALL·BREAK_MISSING_FORECAST는
     * 전 직원 대상, MINOR_NIGHT_FORECAST·MINOR_HOURS_FORECAST는 연소근로자(만 18세 미만)만 해당.
     */
    private void collectForecastRisks(List<Item> items, Long employeeId, String name,
                                      EmployeeStoreRelation rel, List<WorkShift> nextWeekShifts, LocalDate today) {
        if (nextWeekShifts.isEmpty()) {
            return;
        }
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal maxSingleShiftHours = BigDecimal.ZERO;
        boolean breakMissing = false;
        boolean nightOverlap = false;
        for (WorkShift shift : nextWeekShifts) {
            BigDecimal hours = shiftHours(shift);
            totalHours = totalHours.add(hours);
            if (hours.compareTo(maxSingleShiftHours) > 0) {
                maxSingleShiftHours = hours;
            }
            if (hours.compareTo(BREAK_REQUIRED_AT_4H) >= 0) {
                breakMissing = true; // WorkShift에 휴게 필드 자체가 없어 배치 여부를 확인할 수 없음(구조적 미배치)
            }
            if (overlapsNightWindow(shift)) {
                nightOverlap = true;
            }
        }

        if (totalHours.compareTo(FORECAST_52H_THRESHOLD) >= 0) {
            items.add(new Item(RiskType.SCHEDULE_52H_FORECAST, Severity.DANGER, employeeId, name,
                    String.format("다음 주 확정 근무가 %s시간이에요. 주 52시간을 초과할 가능성이 있어요.",
                            stripZeros(totalHours)),
                    totalHours));
        }
        if (totalHours.compareTo(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE) < 0) {
            items.add(new Item(RiskType.SCHEDULE_15H_SHORTFALL, Severity.WARN, employeeId, name,
                    String.format("다음 주 확정 근무가 %s시간이에요 — 주휴수당 발생 기준(%s시간) 미만이 될 가능성이 있어요.",
                            stripZeros(totalHours), stripZeros(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE)),
                    totalHours));
        }
        if (breakMissing) {
            items.add(new Item(RiskType.BREAK_MISSING_FORECAST, Severity.WARN, employeeId, name,
                    String.format("다음 주 근무 중 %s시간짜리 시프트가 있어요 — 4시간 이상은 30분, 8시간 이상은 1시간 휴게 배치가 필요해요. 스케줄에 휴게 배치를 확인해 주세요.",
                            stripZeros(maxSingleShiftHours)),
                    maxSingleShiftHours));
        }

        LocalDate birthDate = employeeBirthDate(rel);
        if (!minorLaborGuardService.isMinor(birthDate, today)) {
            return;
        }
        if (nightOverlap) {
            items.add(new Item(RiskType.MINOR_NIGHT_FORECAST, Severity.DANGER, employeeId, name,
                    "연소근로자(만 18세 미만)의 다음 주 근무가 야간(22:00~06:00) 시간대에 걸쳐 있어요. "
                            + "야간근로는 원칙적으로 금지이며 고용노동부 인가와 본인 동의가 필요해요.",
                    null));
        }
        boolean dailyOver = maxSingleShiftHours.compareTo(MINOR_DAILY_FORECAST_LIMIT) >= 0;
        boolean weeklyOver = totalHours.compareTo(MINOR_WEEKLY_FORECAST_LIMIT) >= 0;
        if (dailyOver || weeklyOver) {
            items.add(new Item(RiskType.MINOR_HOURS_FORECAST, Severity.DANGER, employeeId, name,
                    String.format("연소근로자(만 18세 미만)의 다음 주 근무가 %s 한도를 넘을 가능성이 있어요(1일 %s시간/1주 %s시간).",
                            dailyOver && weeklyOver ? "1일·1주" : (dailyOver ? "1일" : "1주"),
                            stripZeros(MINOR_DAILY_FORECAST_LIMIT), stripZeros(MINOR_WEEKLY_FORECAST_LIMIT)),
                    weeklyOver ? totalHours : maxSingleShiftHours));
        }
    }

    /** 시프트가 야간(22:00~익일 06:00) 시간대와 겹치는지 — 22:00 정각 포함(경계 포함), 21:59는 미포함. */
    private boolean overlapsNightWindow(WorkShift shift) {
        LocalDateTime start = shift.getShiftDate().atTime(shift.getStartTime());
        LocalDateTime end = shift.crossesMidnight()
                ? shift.getShiftDate().plusDays(1).atTime(shift.getEndTime())
                : shift.getShiftDate().atTime(shift.getEndTime());
        LocalDateTime nightStart = shift.getShiftDate().atTime(MinorLaborStandards.NIGHT_START_HOUR, 0);
        LocalDateTime nightEnd = shift.getShiftDate().plusDays(1).atTime(MinorLaborStandards.NIGHT_END_HOUR, 0);
        return start.isBefore(nightEnd) && !end.isBefore(nightStart);
    }

    private LocalDate employeeBirthDate(EmployeeStoreRelation rel) {
        EmployeeProfile profile = rel.getEmployeeProfile();
        User user = profile == null ? null : profile.getUser();
        return user == null ? null : user.getBirthDate();
    }

    /**
     * HC-4 아님 — 판정 자체가 다른 기능을 켜지 않는다는 것과 별개로, 같은 직원에게 52h 계열
     * 리스크가 여러 건 뜨는 노이즈만 정리한다. 우선순위 낮은 항목을 제거한다(리스트 자체를 변경).
     */
    private void dedupe52hFamily(List<Item> items) {
        Map<Long, RiskType> bestByEmployee = new HashMap<>();
        for (Item item : items) {
            int priority = FIFTY_TWO_HOUR_FAMILY_PRIORITY.indexOf(item.type());
            if (priority < 0 || item.employeeId() == null) {
                continue;
            }
            RiskType current = bestByEmployee.get(item.employeeId());
            if (current == null || priority < FIFTY_TWO_HOUR_FAMILY_PRIORITY.indexOf(current)) {
                bestByEmployee.put(item.employeeId(), item.type());
            }
        }
        items.removeIf(item -> {
            int priority = FIFTY_TWO_HOUR_FAMILY_PRIORITY.indexOf(item.type());
            if (priority < 0 || item.employeeId() == null) {
                return false;
            }
            return item.type() != bestByEmployee.get(item.employeeId());
        });
    }

    /**
     * (7) 상시근로자 참고 산정값이 5인 경계에 근접 — 매장 단위 항목(employeeId 없음).
     * 산정은 {@link StatutoryHeadcountService}(근기법 §7의2 전용, 세액공제 산정과 무관) 위임.
     * HC-4: 이 판정은 다른 기능을 켜거나 끄지 않는다 — 대시보드 노출만 한다.
     */
    private void collectHeadcountThresholdRisk(List<Item> items, Long storeId, LocalDate today) {
        var headcount = statutoryHeadcountService.referenceHeadcount(storeId, today);
        if (headcount.operatingDays() == 0) {
            return; // 산정 근거 데이터(가동일) 없음 — 항목 생략
        }
        BigDecimal lower = StatutoryHeadcountStandards.THRESHOLD.subtract(StatutoryHeadcountStandards.WATCH_ZONE_MARGIN);
        BigDecimal upper = StatutoryHeadcountStandards.THRESHOLD.add(StatutoryHeadcountStandards.WATCH_ZONE_MARGIN);
        BigDecimal value = headcount.statutoryHeadcount();
        if (value.compareTo(lower) < 0 || value.compareTo(upper) >= 0) {
            return; // 경계에서 충분히 먼 값은 노출하지 않는다
        }
        items.add(new Item(RiskType.HEADCOUNT_THRESHOLD, Severity.WARN, null, null,
                String.format("최근 1개월 상시근로자 참고 산정 %s명 — 5인 경계에 %s 있어요. %s",
                        stripZeros(value),
                        headcount.meetsThreshold() ? "근접했거나 도달했을 가능성이" : "근접했을 가능성이",
                        headcount.disclaimer()),
                value));
    }

    /** (1) 주휴 15h 경계 + (2) 주 52h 임박. */
    private void collectWeeklyHoursRisks(List<Item> items, Long employeeId, String name,
                                         BigDecimal weekShiftTotal, BigDecimal combinedTotal) {
        if (weekShiftTotal.compareTo(BOUNDARY_LOW) >= 0 && weekShiftTotal.compareTo(BOUNDARY_HIGH) <= 0) {
            items.add(new Item(RiskType.WEEKLY_15H_BOUNDARY, Severity.WARN, employeeId, name,
                    String.format("이번 주 확정 근무 %s시간 — 주휴수당 발생 기준(%s시간) 경계예요. 1시간 차이로 주휴수당이 달라져요.",
                            stripZeros(weekShiftTotal), stripZeros(LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE)),
                    weekShiftTotal));
        }
        if (combinedTotal.compareTo(NEAR_52H_THRESHOLD) >= 0) {
            items.add(new Item(RiskType.WEEKLY_52H_NEAR, Severity.WARN, employeeId, name,
                    String.format("이번 주 실근무+확정 시프트 합계 %s시간 — 주 52시간 한도에 근접했어요.",
                            stripZeros(combinedTotal)),
                    combinedTotal));
        }
    }

    /** (3) 근로계약서 없음/미서명 — 즉시 위법 가능(§17). */
    private void collectContractRisk(List<Item> items, Long employeeId, String name, Optional<LaborContract> latest) {
        if (latest.isEmpty()) {
            items.add(new Item(RiskType.CONTRACT_UNSIGNED, Severity.DANGER, employeeId, name,
                    "근로계약서가 없어요. 근로기준법 §17 서면 명시·교부 의무 위반 소지가 있어요.", null));
        } else if (!latest.get().isSigned()) {
            items.add(new Item(RiskType.CONTRACT_UNSIGNED, Severity.DANGER, employeeId, name,
                    "근로계약서가 아직 서명되지 않았어요. 직원 서명을 받아 교부를 완료해 주세요.", null));
        }
        // (6) 월급제 스케줄 약정 주 52h 초과 — 저장은 허용하되 대시보드 경고(사용자 결정, 2026-07-05)
        latest.ifPresent(contract -> collectContractOver52hRisk(items, employeeId, name, contract));
    }

    /**
     * (6) 월급제 계약 스케줄의 주 연장이 12시간 초과(= 주 52시간 한도 초과 약정, §53).
     * 계약 저장 시 차단하지 않는 대신 여기서 경고한다. 시급제(HOURLY) 계약은 스케줄 산출
     * 대상이 아니므로 자연히 제외된다.
     */
    private void collectContractOver52hRisk(List<Item> items, Long employeeId, String name, LaborContract contract) {
        if (!contract.isScheduleDerivedSalary()) {
            return;
        }
        try {
            double weeklyOvertime = com.rich.sodam.core.payroll.wage.WorkScheduleCalculator
                    .weeklyStats(contract.getWorkSchedule()).weeklyOvertimeHours();
            if (weeklyOvertime > MAX_WEEKLY_OVERTIME_HOURS) {
                items.add(new Item(RiskType.CONTRACT_OVER_52H, Severity.WARN, employeeId, name,
                        String.format("월급제 계약 스케줄의 주 연장근로가 %s시간이에요 — 주 52시간 한도(연장 12시간, §53) 초과 약정입니다. 계약 조정을 검토해 주세요.",
                                stripZeros(BigDecimal.valueOf(weeklyOvertime))),
                        BigDecimal.valueOf(weeklyOvertime)));
            }
        } catch (IllegalArgumentException e) {
            // 저장된 스케줄이 구조 오류면 리스크 산정만 건너뛴다(대시보드가 계약 조회를 깨지 않게)
        }
    }

    /** (4) 최저임금 미달 — 현행 미만 DANGER, 차기년도 고시 미만 WARN. */
    private void collectMinWageRisk(List<Item> items, Long employeeId, String name,
                                    EmployeeStoreRelation rel, BigDecimal currentMinWage,
                                    Integer nextYearMinWage, int year) {
        BigDecimal wage = BigDecimal.valueOf(rel.getAppliedHourlyWage());
        if (wage.compareTo(currentMinWage) < 0) {
            items.add(new Item(RiskType.MIN_WAGE_RISK, Severity.DANGER, employeeId, name,
                    String.format("적용 시급 %,d원이 %d년 최저임금(%,d원) 미만이에요. 즉시 인상이 필요해요.",
                            wage.intValue(), year, currentMinWage.intValue()),
                    wage));
        } else if (nextYearMinWage != null && wage.compareTo(BigDecimal.valueOf(nextYearMinWage)) < 0) {
            items.add(new Item(RiskType.MIN_WAGE_RISK, Severity.WARN, employeeId, name,
                    String.format("적용 시급 %,d원이 %d년 최저임금(%,d원) 미만이에요. 연초 전에 인상 계획을 세워 주세요.",
                            wage.intValue(), year + 1, nextYearMinWage),
                    wage));
        }
    }

    /** (5) 퇴직금 채권 발생 임박 — 입사(관계 생성일) 11개월 이상 경과. */
    private void collectSeveranceRisk(List<Item> items, Long employeeId, String name,
                                      EmployeeStoreRelation rel, LocalDate today) {
        if (rel.getHireDate() == null) return;
        long months = ChronoUnit.MONTHS.between(rel.getHireDate(), today);
        if (months >= SEVERANCE_WARN_MONTHS) {
            String phase = months >= 12 ? "1년 이상 근속 — 퇴직금 채권이 이미 발생했어요."
                    : "1년 근속(퇴직금 채권 발생)이 임박했어요.";
            items.add(new Item(RiskType.SEVERANCE_UPCOMING, Severity.WARN, employeeId, name,
                    String.format("근속 %d개월(입사 %s). %s 퇴직금 재원을 미리 준비해 주세요.",
                            months, rel.getHireDate(), phase),
                    BigDecimal.valueOf(months)));
        }
    }

    /** 시프트 시간(시간 단위). 야간(익일 종료)은 24h 보정 — WorkShift.crossesMidnight 규약. */
    private BigDecimal shiftHours(WorkShift shift) {
        long minutes = Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes();
        if (shift.crossesMidnight()) {
            minutes += 24 * 60;
        }
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private String employeeName(EmployeeStoreRelation rel) {
        if (rel.getEmployeeProfile().getUser() != null && rel.getEmployeeProfile().getUser().getName() != null) {
            return rel.getEmployeeProfile().getUser().getName();
        }
        return "직원";
    }

    private String stripZeros(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }
}
