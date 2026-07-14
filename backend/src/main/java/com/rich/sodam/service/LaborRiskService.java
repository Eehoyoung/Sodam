package com.rich.sodam.service;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.domain.Store;
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

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository relationRepository;
    private final WorkShiftRepository workShiftRepository;
    private final AttendanceRepository attendanceRepository;
    private final LaborContractRepository laborContractRepository;
    private final LaborInfoRepository laborInfoRepository;

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
        }
        return new LaborRiskResponse(items);
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
