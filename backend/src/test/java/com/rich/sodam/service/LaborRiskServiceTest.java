package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.LaborInfo;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import com.rich.sodam.dto.response.LaborRiskResponse.RiskType;
import com.rich.sodam.dto.response.LaborRiskResponse.Severity;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.LaborInfoRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 노무 리스크 대시보드 — 리스크 타입별 검출 검증(H2).
 *
 * <p>기준일 2026-07-06(월) 고정 — 주(월~일) 경계·연도(2026 최저임금 10,320원)가 결정적이도록.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborRiskServiceTest {

    /** 2026-07-06 은 월요일. */
    private static final LocalDate MONDAY = LocalDate.of(2026, 7, 6);

    @Autowired private LaborRiskService service;
    @Autowired private StoreRepository storeRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;
    @Autowired private WorkShiftRepository shiftRepo;
    @Autowired private LaborContractRepository contractRepo;
    @Autowired private LaborInfoRepository laborInfoRepo;
    @Autowired private AttendanceRepository attendanceRepo;

    private Store store;
    private int bizSeq = 0;

    @BeforeEach
    void setUp() {
        String biz = String.format("%010d", 7770001110L + (bizSeq++));
        store = storeRepo.save(new Store("리스크매장", biz, "02-777-0001", "카페", 11_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    private EmployeeStoreRelation relate(EmployeeProfile emp, Integer customWage, LocalDate hireDate) {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, customWage);
        rel.setHireDate(hireDate);
        return relRepo.save(rel);
    }

    private void confirmedShift(EmployeeProfile emp, LocalDate date, LocalTime start, LocalTime end) {
        WorkShift shift = WorkShift.create(emp.getId(), store.getId(), date, start, end, null);
        shift.confirm();
        shiftRepo.save(shift);
    }

    /** 연소근로자(만 18세 미만) 테스트용 — 생년월일을 지정해 프로필을 완성한다. */
    private EmployeeProfile minorEmployee(String email, String name, LocalDate birthDate) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u.completeProfile("01000000000", name, birthDate);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    /** 산정기간 일자별 가동일 조작용 — 출근만(퇴근 없이) 기록. */
    private void attendanceOn(EmployeeProfile emp, LocalDate date) {
        Attendance att = new Attendance(emp, store);
        att.manualCheckIn(date.atTime(9, 0), null, null, 11_000);
        attendanceRepo.save(att);
    }

    private void signedContract(EmployeeProfile emp) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        c.setHourlyWage(11_000);
        c.markSigned(LocalDateTime.now(), null);
        contractRepo.save(c);
    }

    private List<Item> itemsOf(RiskType type) {
        LaborRiskResponse res = service.analyze(store.getId(), MONDAY);
        return res.items().stream().filter(i -> i.type() == type).toList();
    }

    @Test
    @DisplayName("WEEKLY_15H_BOUNDARY — 이번 주 확정 시프트 합계 14시간(13~17h 구간) 직원 검출")
    void detectsWeekly15hBoundary() {
        EmployeeProfile emp = employee("risk15@t.co", "경계직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp);
        confirmedShift(emp, MONDAY, LocalTime.of(9, 0), LocalTime.of(16, 0));            // 7h
        confirmedShift(emp, MONDAY.plusDays(1), LocalTime.of(9, 0), LocalTime.of(16, 0)); // 7h → 14h

        List<Item> items = itemsOf(RiskType.WEEKLY_15H_BOUNDARY);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("14"));
        // 서명된 계약이 있으므로 계약 리스크는 없어야 한다
        assertThat(itemsOf(RiskType.CONTRACT_UNSIGNED))
                .noneMatch(i -> i.employeeId().equals(emp.getId()));
    }

    @Test
    @DisplayName("WEEKLY_52H_NEAR — 실근무+확정 시프트 합계 48시간 이상 직원 검출")
    void detectsWeekly52hNear() {
        EmployeeProfile emp = employee("risk52@t.co", "과로직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        for (int d = 0; d < 6; d++) { // 월~토 8.5h × 6 = 51h
            confirmedShift(emp, MONDAY.plusDays(d), LocalTime.of(9, 0), LocalTime.of(17, 30));
        }

        List<Item> items = itemsOf(RiskType.WEEKLY_52H_NEAR);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("51"));
    }

    @Test
    @DisplayName("CONTRACT_UNSIGNED — 근로계약서 없음/미서명 재직 직원은 DANGER 로 검출")
    void detectsUnsignedContract() {
        EmployeeProfile noContract = employee("risknc@t.co", "무계약직원");
        relate(noContract, 11_000, MONDAY.minusMonths(1));

        EmployeeProfile unsigned = employee("riskus@t.co", "미서명직원");
        relate(unsigned, 11_000, MONDAY.minusMonths(1));
        LaborContract c = new LaborContract();
        c.setEmployeeId(unsigned.getId());
        c.setStoreId(store.getId());
        contractRepo.save(c); // 미서명

        List<Item> items = itemsOf(RiskType.CONTRACT_UNSIGNED);
        assertThat(items).extracting(Item::employeeId)
                .containsExactlyInAnyOrder(noContract.getId(), unsigned.getId());
        assertThat(items).allMatch(i -> i.severity() == Severity.DANGER);
    }

    @Test
    @DisplayName("MIN_WAGE_RISK — 현행(2026: 10,320원) 미만은 DANGER, 차기년도 고시 미만은 WARN")
    void detectsMinWageRisk() {
        EmployeeProfile low = employee("risklow@t.co", "저임금직원");
        relate(low, 9_000, MONDAY.minusMonths(1)); // 현행 미만

        EmployeeProfile nextYear = employee("risknext@t.co", "차기경계직원");
        relate(nextYear, 10_500, MONDAY.minusMonths(1)); // 현행 이상, 2027 고시(10,700) 미만

        LaborInfo info = new LaborInfo();
        info.setTitle("2027 최저임금");
        info.setContent("고시");
        info.setYear(2027);
        info.setMinimumWage(10_700);
        laborInfoRepo.save(info);

        List<Item> items = itemsOf(RiskType.MIN_WAGE_RISK);
        assertThat(items).hasSize(2);
        Item danger = items.stream().filter(i -> i.employeeId().equals(low.getId())).findFirst().orElseThrow();
        assertThat(danger.severity()).isEqualTo(Severity.DANGER);
        assertThat(danger.value()).isEqualByComparingTo(new BigDecimal("9000"));
        Item warn = items.stream().filter(i -> i.employeeId().equals(nextYear.getId())).findFirst().orElseThrow();
        assertThat(warn.severity()).isEqualTo(Severity.WARN);
    }

    @Test
    @DisplayName("SEVERANCE_UPCOMING — 입사 11개월 이상 경과 직원 검출(퇴직금 채권 임박)")
    void detectsSeveranceUpcoming() {
        EmployeeProfile emp = employee("risksev@t.co", "장기근속직원");
        relate(emp, 11_000, MONDAY.minusMonths(11).minusDays(3));

        EmployeeProfile fresh = employee("riskfresh@t.co", "신입직원");
        relate(fresh, 11_000, MONDAY.minusMonths(2));

        List<Item> items = itemsOf(RiskType.SEVERANCE_UPCOMING);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("11"));
    }

    @Test
    @DisplayName("리스크가 전혀 없으면 빈 배열")
    void emptyWhenNoRisk() {
        EmployeeProfile emp = employee("risksafe@t.co", "안전직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp);

        assertThat(service.analyze(store.getId(), MONDAY).items()).isEmpty();
    }

    /** 월급제 스케줄 계약 저장(요일별 근무 스케줄 + 기준시급). 일 11h × days.length 근무. */
    private void salaryScheduleContract(EmployeeProfile emp, java.time.DayOfWeek... days) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        c.setPayType(com.rich.sodam.domain.type.LaborContractPayType.SALARY);
        c.setSalaryBaseHourlyWage(11_000);
        c.setWorkSchedule(java.util.Arrays.stream(days)
                .map(d -> new com.rich.sodam.core.payroll.wage.WorkScheduleDay(
                        d, LocalTime.of(11, 0), LocalTime.of(23, 0), LocalTime.of(15, 0), LocalTime.of(16, 0)))
                .toList());
        c.markSigned(LocalDateTime.now(), null);
        contractRepo.save(c);
    }

    @Test
    @DisplayName("CONTRACT_OVER_52H — 월급제 스케줄 주 연장 12h 초과(주 6일×11h=연장 26h) 계약 경고")
    void detectsContractOver52h() {
        EmployeeProfile emp = employee("risk52c@t.co", "과로계약직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        salaryScheduleContract(emp, java.time.DayOfWeek.MONDAY, java.time.DayOfWeek.TUESDAY,
                java.time.DayOfWeek.WEDNESDAY, java.time.DayOfWeek.THURSDAY,
                java.time.DayOfWeek.FRIDAY, java.time.DayOfWeek.SATURDAY);

        List<Item> items = itemsOf(RiskType.CONTRACT_OVER_52H);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).employeeId()).isEqualTo(emp.getId());
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("26"));
    }

    @Test
    @DisplayName("CONTRACT_OVER_52H — 주 연장 12h 이내(주 4일×11h=연장 12h) 월급제 계약은 미검출")
    void noOver52hWhenWithinLimit() {
        EmployeeProfile emp = employee("risk52ok@t.co", "적법계약직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        salaryScheduleContract(emp, java.time.DayOfWeek.MONDAY, java.time.DayOfWeek.TUESDAY,
                java.time.DayOfWeek.WEDNESDAY, java.time.DayOfWeek.THURSDAY);

        assertThat(itemsOf(RiskType.CONTRACT_OVER_52H)).isEmpty();
    }

    @Test
    @DisplayName("CONTRACT_OVER_52H — 시급제(HOURLY) 계약은 스케줄 산출 대상이 아니므로 미검출")
    void hourlyContractNotFlaggedForOver52h() {
        EmployeeProfile emp = employee("risk52h@t.co", "시급제직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp); // payType 기본 HOURLY

        assertThat(itemsOf(RiskType.CONTRACT_OVER_52H)).isEmpty();
    }

    @Test
    @DisplayName("HEADCOUNT_THRESHOLD — 산정기간 연인원 49명/가동일 10일(4.9명)이면 5인 경계 근접 WARN 노출")
    void detectsHeadcountThresholdNear5() {
        EmployeeProfile owner = employee("riskhc0@t.co", "재직직원");
        relate(owner, 11_000, MONDAY.minusMonths(2)); // early-return 방지용 활성 관계 1건

        EmployeeProfile e1 = employee("riskhc1@t.co", "직원1");
        EmployeeProfile e2 = employee("riskhc2@t.co", "직원2");
        EmployeeProfile e3 = employee("riskhc3@t.co", "직원3");
        EmployeeProfile e4 = employee("riskhc4@t.co", "직원4");
        EmployeeProfile e5 = employee("riskhc5@t.co", "직원5");

        // 산정기간 = MONDAY(2026-07-06) 전 1개월 = 2026-06-06~2026-07-05.
        // 2026-06-10~06-18(9일) 5명, 06-19(1일) 4명 → 연인원 49 / 가동일 10 = 4.9명.
        LocalDate firstDay = LocalDate.of(2026, 6, 10);
        for (int d = 0; d < 9; d++) {
            LocalDate day = firstDay.plusDays(d);
            attendanceOn(e1, day);
            attendanceOn(e2, day);
            attendanceOn(e3, day);
            attendanceOn(e4, day);
            attendanceOn(e5, day);
        }
        LocalDate lastDay = firstDay.plusDays(9);
        attendanceOn(e1, lastDay);
        attendanceOn(e2, lastDay);
        attendanceOn(e3, lastDay);
        attendanceOn(e4, lastDay);

        List<Item> items = itemsOf(RiskType.HEADCOUNT_THRESHOLD);
        assertThat(items).hasSize(1);
        Item item = items.get(0);
        assertThat(item.severity()).isEqualTo(Severity.WARN);
        assertThat(item.value()).isEqualByComparingTo(new BigDecimal("4.9"));
        assertThat(item.employeeId()).isNull(); // 매장 단위 항목 — 특정 직원 귀속 아님
        assertThat(item.message()).contains("참고").contains("근로감독관");
    }

    @Test
    @DisplayName("HEADCOUNT_THRESHOLD — 출근 기록이 없으면(가동일 0일) 항목이 생성되지 않는다")
    void noHeadcountThresholdWithoutAttendanceData() {
        EmployeeProfile emp = employee("riskhcnone@t.co", "재직직원");
        relate(emp, 11_000, MONDAY.minusMonths(2));

        assertThat(itemsOf(RiskType.HEADCOUNT_THRESHOLD)).isEmpty();
    }

    @Test
    @DisplayName("HC-4: 상시근로자 경계 판정은 다른 리스크 검출·응답 구조를 변경하지 않는다")
    void headcountThresholdDoesNotAlterOtherRisks() {
        EmployeeProfile emp = employee("riskhcisolated@t.co", "경계직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        signedContract(emp);

        EmployeeProfile e1 = employee("riskhciso1@t.co", "직원1");
        EmployeeProfile e2 = employee("riskhciso2@t.co", "직원2");
        EmployeeProfile e3 = employee("riskhciso3@t.co", "직원3");
        EmployeeProfile e4 = employee("riskhciso4@t.co", "직원4");
        EmployeeProfile e5 = employee("riskhciso5@t.co", "직원5");
        LocalDate firstDay = LocalDate.of(2026, 6, 10);
        for (int d = 0; d < 10; d++) {
            LocalDate day = firstDay.plusDays(d);
            attendanceOn(e1, day);
            attendanceOn(e2, day);
            attendanceOn(e3, day);
            attendanceOn(e4, day);
            attendanceOn(e5, day);
        }

        LaborRiskResponse res = service.analyze(store.getId(), MONDAY);

        // 5.0명 항목이 뜨더라도, 서명된 계약 직원의 CONTRACT_UNSIGNED 미검출 등 기존 판정은 그대로다.
        assertThat(res.items().stream().anyMatch(i -> i.type() == RiskType.HEADCOUNT_THRESHOLD)).isTrue();
        assertThat(res.items()).noneMatch(i -> i.type() == RiskType.CONTRACT_UNSIGNED && i.employeeId().equals(emp.getId()));
    }

    // ── WP-2: 사후 감지 → 사전 예측(다음 주 확정 시프트 기반) ─────────────────────────────

    /** 다음 주(월요일) — MONDAY(2026-07-06) 기준 2026-07-13. */
    private static final LocalDate NEXT_WEEK_MONDAY = MONDAY.plusWeeks(1);

    @Test
    @DisplayName("SCHEDULE_52H_FORECAST — 다음 주 확정 시프트 합계 52.0시간이면 DANGER 검출")
    void detectsSchedule52hForecastAt520() {
        EmployeeProfile emp = employee("fc52a@t.co", "다음주과로직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        for (int d = 0; d < 4; d++) { // 13h × 4일 = 52h
            confirmedShift(emp, NEXT_WEEK_MONDAY.plusDays(d), LocalTime.of(8, 0), LocalTime.of(21, 0));
        }

        List<Item> items = itemsOf(RiskType.SCHEDULE_52H_FORECAST);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.DANGER);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("52"));
    }

    @Test
    @DisplayName("SCHEDULE_52H_FORECAST — 다음 주 확정 시프트 합계 51.9시간이면 미검출")
    void noSchedule52hForecastAt519() {
        EmployeeProfile emp = employee("fc52b@t.co", "다음주적정직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        for (int d = 0; d < 4; d++) { // 12h × 4일 = 48h
            confirmedShift(emp, NEXT_WEEK_MONDAY.plusDays(d), LocalTime.of(8, 0), LocalTime.of(20, 0));
        }
        confirmedShift(emp, NEXT_WEEK_MONDAY.plusDays(4), LocalTime.of(8, 0), LocalTime.of(11, 54)); // 3.9h → 51.9h

        assertThat(itemsOf(RiskType.SCHEDULE_52H_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("SCHEDULE_15H_SHORTFALL — 다음 주 확정 시프트 합계 14.9시간이면 WARN 검출(주휴 미발생 가능)")
    void detectsSchedule15hShortfallAt149() {
        EmployeeProfile emp = employee("fc15a@t.co", "다음주부족직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        confirmedShift(emp, NEXT_WEEK_MONDAY, LocalTime.of(8, 0), LocalTime.of(22, 54)); // 14.9h

        List<Item> items = itemsOf(RiskType.SCHEDULE_15H_SHORTFALL);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("14.9"));
    }

    @Test
    @DisplayName("SCHEDULE_15H_SHORTFALL — 다음 주 확정 시프트 합계 15.0시간이면 미검출")
    void noSchedule15hShortfallAt150() {
        EmployeeProfile emp = employee("fc15b@t.co", "다음주충족직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        confirmedShift(emp, NEXT_WEEK_MONDAY, LocalTime.of(8, 0), LocalTime.of(23, 0)); // 15.0h

        assertThat(itemsOf(RiskType.SCHEDULE_15H_SHORTFALL)).isEmpty();
    }

    @Test
    @DisplayName("BREAK_MISSING_FORECAST — 다음 주 확정 시프트가 4.0시간이면 휴게 배치 필요 WARN 검출")
    void detectsBreakMissingForecastAt40() {
        EmployeeProfile emp = employee("fcbrk1@t.co", "휴게경계직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        confirmedShift(emp, NEXT_WEEK_MONDAY, LocalTime.of(9, 0), LocalTime.of(13, 0)); // 4.0h

        List<Item> items = itemsOf(RiskType.BREAK_MISSING_FORECAST);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.WARN);
    }

    @Test
    @DisplayName("BREAK_MISSING_FORECAST — 다음 주 확정 시프트가 3.9시간이면 미검출")
    void noBreakMissingForecastAt39() {
        EmployeeProfile emp = employee("fcbrk2@t.co", "휴게미해당직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        confirmedShift(emp, NEXT_WEEK_MONDAY, LocalTime.of(9, 0), LocalTime.of(12, 54)); // 3.9h

        assertThat(itemsOf(RiskType.BREAK_MISSING_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("MINOR_NIGHT_FORECAST — 연소근로자 다음 주 시프트가 22:00 정각까지면 DANGER 검출(경계 포함)")
    void detectsMinorNightForecastAt2200() {
        EmployeeProfile minor = minorEmployee("fcnight1@t.co", "연소야간직원", MONDAY.minusYears(17));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        confirmedShift(minor, NEXT_WEEK_MONDAY, LocalTime.of(19, 0), LocalTime.of(22, 0));

        List<Item> items = itemsOf(RiskType.MINOR_NIGHT_FORECAST);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.DANGER);
    }

    @Test
    @DisplayName("MINOR_NIGHT_FORECAST — 연소근로자 다음 주 시프트가 21:59까지면 미검출(야간 미해당)")
    void noMinorNightForecastAt2159() {
        EmployeeProfile minor = minorEmployee("fcnight2@t.co", "연소주간직원", MONDAY.minusYears(17));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        confirmedShift(minor, NEXT_WEEK_MONDAY, LocalTime.of(19, 0), LocalTime.of(21, 59));

        assertThat(itemsOf(RiskType.MINOR_NIGHT_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("MINOR_NIGHT_FORECAST — 성인 직원은 같은 야간 시프트여도 미검출(연소자 전용)")
    void minorNightForecastNotAppliedToAdult() {
        EmployeeProfile adult = employee("fcnight3@t.co", "성인야간직원");
        relate(adult, 11_000, MONDAY.minusMonths(1));
        confirmedShift(adult, NEXT_WEEK_MONDAY, LocalTime.of(19, 0), LocalTime.of(23, 0));

        assertThat(itemsOf(RiskType.MINOR_NIGHT_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("MINOR_HOURS_FORECAST — 연소근로자 1일 시프트 7.0시간이면 DANGER 검출(1일 한도 경계)")
    void detectsMinorHoursForecastDailyAt70() {
        EmployeeProfile minor = minorEmployee("fchour1@t.co", "연소7시간직원", MONDAY.minusYears(16));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        confirmedShift(minor, NEXT_WEEK_MONDAY, LocalTime.of(9, 0), LocalTime.of(16, 0)); // 7.0h, 주 총합도 7h

        List<Item> items = itemsOf(RiskType.MINOR_HOURS_FORECAST);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.DANGER);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("7.0"));
    }

    @Test
    @DisplayName("MINOR_HOURS_FORECAST — 연소근로자 1일 시프트 6.9시간이면 미검출(1일 한도 경계)")
    void noMinorHoursForecastDailyAt69() {
        EmployeeProfile minor = minorEmployee("fchour2@t.co", "연소6.9시간직원", MONDAY.minusYears(16));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        confirmedShift(minor, NEXT_WEEK_MONDAY, LocalTime.of(9, 0), LocalTime.of(15, 54)); // 6.9h

        assertThat(itemsOf(RiskType.MINOR_HOURS_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("MINOR_HOURS_FORECAST — 연소근로자 1주 합계 35.0시간(개별 시프트는 7h 미만)이면 DANGER 검출(1주 한도 경계)")
    void detectsMinorHoursForecastWeeklyAt350() {
        EmployeeProfile minor = minorEmployee("fchour3@t.co", "연소주35시간직원", MONDAY.minusYears(16));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        // 5일×5h50m(5.83h) + 1일×5h51m(5.85h) = 35.00h, 개별 시프트는 전부 7h 미만(1일 한도 미해당)
        for (int d = 0; d < 5; d++) {
            confirmedShift(minor, NEXT_WEEK_MONDAY.plusDays(d), LocalTime.of(9, 0), LocalTime.of(14, 50));
        }
        confirmedShift(minor, NEXT_WEEK_MONDAY.plusDays(5), LocalTime.of(9, 0), LocalTime.of(14, 51));

        List<Item> items = itemsOf(RiskType.MINOR_HOURS_FORECAST);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).severity()).isEqualTo(Severity.DANGER);
        assertThat(items.get(0).value()).isEqualByComparingTo(new BigDecimal("35.00"));
        assertThat(items.get(0).message()).contains("1주");
    }

    @Test
    @DisplayName("MINOR_HOURS_FORECAST — 연소근로자 1주 합계 34.9시간(개별 시프트는 7h 미만)이면 미검출(1주 한도 경계)")
    void noMinorHoursForecastWeeklyAt349() {
        EmployeeProfile minor = minorEmployee("fchour4@t.co", "연소주34.9시간직원", MONDAY.minusYears(16));
        relate(minor, 11_000, MONDAY.minusMonths(1));
        // 5일×6h59m(6.98h) = 34.90h, 개별 시프트는 전부 7h 미만
        for (int d = 0; d < 5; d++) {
            confirmedShift(minor, NEXT_WEEK_MONDAY.plusDays(d), LocalTime.of(8, 0), LocalTime.of(14, 59));
        }

        assertThat(itemsOf(RiskType.MINOR_HOURS_FORECAST)).isEmpty();
    }

    @Test
    @DisplayName("52h 계열 중복 억제 — 계약 약정 초과(CONTRACT_OVER_52H)와 다음 주 예측(SCHEDULE_52H_FORECAST)이 겹치면 계약 쪽만 노출")
    void dedupes52hFamilyPrefersContractOver52h() {
        EmployeeProfile emp = employee("dedupe52@t.co", "중복52시간직원");
        relate(emp, 11_000, MONDAY.minusMonths(1));
        // 계약: 월급제 스케줄 주 6일×11h — 연장 26h(주 52h 한도 초과 약정) → CONTRACT_OVER_52H
        salaryScheduleContract(emp, java.time.DayOfWeek.MONDAY, java.time.DayOfWeek.TUESDAY,
                java.time.DayOfWeek.WEDNESDAY, java.time.DayOfWeek.THURSDAY,
                java.time.DayOfWeek.FRIDAY, java.time.DayOfWeek.SATURDAY);
        // 다음 주 확정 시프트도 52h 이상 → SCHEDULE_52H_FORECAST 조건도 동시 충족
        for (int d = 0; d < 4; d++) {
            confirmedShift(emp, NEXT_WEEK_MONDAY.plusDays(d), LocalTime.of(8, 0), LocalTime.of(21, 0)); // 13h×4=52h
        }

        LaborRiskResponse res = service.analyze(store.getId(), MONDAY);
        List<RiskType> fiftyTwoHourFamilyForEmployee = res.items().stream()
                .filter(i -> emp.getId().equals(i.employeeId()))
                .map(Item::type)
                .filter(t -> t == RiskType.CONTRACT_OVER_52H || t == RiskType.SCHEDULE_52H_FORECAST
                        || t == RiskType.WEEKLY_52H_NEAR)
                .toList();

        assertThat(fiftyTwoHourFamilyForEmployee).containsExactly(RiskType.CONTRACT_OVER_52H);
    }
}
