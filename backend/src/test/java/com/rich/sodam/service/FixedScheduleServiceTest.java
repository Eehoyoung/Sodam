package com.rich.sodam.service;

import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.repository.WorkShiftRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 월급제 정규직 고정 스케줄 자동 생성 검증 — 근로계약서 발송 시 활성화, 입사일부터 생성,
 * 사장의 스케줄 보드 수동 수정을 재생성이 절대 덮어쓰지 않는지.
 *
 * <p>{@link FixedScheduleService#ensureGeneratedThrough}는 REQUIRES_NEW 로 별도 트랜잭션에서
 * 커밋되므로(호출측이 읽기전용 트랜잭션이어도 저장이 보장돼야 함) 이 테스트의 {@code @Transactional}
 * 롤백과 무관하게 실제로 커밋된다 — 매 테스트가 고유한 매장을 사용해 서로 간섭하지 않는다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FixedScheduleServiceTest {

    @Autowired private FixedScheduleService fixedScheduleService;
    @Autowired private LaborContractService laborContractService;
    @Autowired private WorkShiftRepository workShiftRepository;
    @Autowired private WorkShiftService workShiftService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    private int seq = 0;

    private Store store() {
        String biz = String.format("%010d", 3334445550L + (seq++));
        return storeRepository.save(new Store("고정스케줄매장", biz, "02-333-5555", "카페", 10_320, 100));
    }

    private EmployeeProfile employee(String email) {
        User u = new User(email, "정규직" + seq);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private EmployeeStoreRelation relate(EmployeeProfile emp, Store store, LocalDate hireDate) {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, null);
        rel.setHireDate(hireDate);
        rel.setIsActive(true);
        return relationRepository.save(rel);
    }

    /** 월·수·금 11:00~15:00 스케줄의 월급제 정규직 계약(§17 최소 필수만 채움). */
    private LaborContract monthlySalaryContract(EmployeeProfile emp, Store store, LocalDate startDate) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(emp.getId());
        c.setStoreId(store.getId());
        c.setPeriodType(ContractPeriodType.PERMANENT);
        c.setPayType(LaborContractPayType.SALARY);
        c.setStartDate(startDate);
        c.setWorkSchedule(List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(11, 0), LocalTime.of(15, 0), null, null),
                new WorkScheduleDay(DayOfWeek.WEDNESDAY, LocalTime.of(11, 0), LocalTime.of(15, 0), null, null),
                new WorkScheduleDay(DayOfWeek.FRIDAY, LocalTime.of(11, 0), LocalTime.of(15, 0), null, null)));
        c.setSalaryBaseHourlyWage(10_320);
        c.setWagePaymentMethod(WagePaymentMethod.BANK_TRANSFER);
        c.setWorkLocation("소담매장 서울점");
        c.setJobDescription("홀 서빙");
        return laborContractService.save(c);
    }

    @Test
    @DisplayName("월급제 정규직 계약이 발송되면 입사일부터 스케줄대로 근무 시프트가 자동 생성된다")
    void activatesAndGeneratesFromHireDate() {
        Store store = store();
        LocalDate hireDate = LocalDate.now().minusDays(10);
        EmployeeProfile emp = employee("fixed1@x.com");
        relate(emp, store, hireDate);
        LaborContract contract = monthlySalaryContract(emp, store, hireDate);

        fixedScheduleService.activateFromContract(contract);

        // 입사일 당일부터 월/수/금 시프트가 존재해야 한다.
        LocalDate monday = hireDate.with(DayOfWeek.MONDAY);
        boolean hasEarlyShift = workShiftRepository
                .existsByEmployeeIdAndStoreIdAndShiftDate(emp.getId(), store.getId(), monday.isBefore(hireDate) ? hireDate : monday);
        assertThat(hasEarlyShift || workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(store.getId(), hireDate, hireDate.plusDays(6))
                .stream().anyMatch(s -> s.getEmployeeId().equals(emp.getId())))
                .isTrue();

        EmployeeStoreRelation relation = relationRepository.findRelation(emp.getId(), store.getId()).orElseThrow();
        assertThat(relation.getFixedWeeklySchedule()).isNotNull();
        assertThat(relation.getFixedScheduleGeneratedThrough()).isNotNull();
        assertThat(relation.getFixedScheduleGeneratedThrough()).isAfterOrEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("시급제/기간제/스케줄 없는 월급제 계약은 고정 스케줄을 활성화하지 않는다")
    void ignoresNonEligibleContracts() {
        Store store = store();
        EmployeeProfile emp = employee("fixed2@x.com");
        relate(emp, store, LocalDate.now());

        LaborContract hourly = new LaborContract();
        hourly.setEmployeeId(emp.getId());
        hourly.setStoreId(store.getId());
        hourly.setPayType(LaborContractPayType.HOURLY);
        hourly.setHourlyWage(10_320);
        hourly.setWagePaymentMethod(WagePaymentMethod.BANK_TRANSFER);
        hourly.setWageComponents("기본급(시급)");
        hourly.setContractedHoursPerWeek(40.0);
        hourly.setWorkStartTime(LocalTime.of(9, 0));
        hourly.setWorkEndTime(LocalTime.of(18, 0));
        hourly.setWeeklyHolidayDay("SUNDAY");
        hourly.setAnnualLeaveNote("§60에 따라 부여");
        hourly.setWorkLocation("소담매장");
        hourly.setJobDescription("홀 서빙");
        LaborContract saved = laborContractService.save(hourly);

        fixedScheduleService.activateFromContract(saved);

        EmployeeStoreRelation relation = relationRepository.findRelation(emp.getId(), store.getId()).orElseThrow();
        assertThat(relation.getFixedWeeklySchedule()).isNull();
        assertThat(relation.getFixedScheduleGeneratedThrough()).isNull();
    }

    @Test
    @DisplayName("사장이 스케줄 보드에서 생성된 시프트를 삭제해도 이후 확장 생성이 되살리지 않는다")
    void manualDeletion_isNotResurrectedByFutureGeneration() {
        Store store = store();
        LocalDate hireDate = LocalDate.now();
        EmployeeProfile emp = employee("fixed3@x.com");
        relate(emp, store, hireDate);
        LaborContract contract = monthlySalaryContract(emp, store, hireDate);

        fixedScheduleService.activateFromContract(contract);
        LocalDate monday = hireDate.with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

        // 사장이 월요일 시프트를 수동으로 삭제(보드에서의 "삭제"와 동일 — 그냥 레포지토리에서 지운다).
        List<WorkShift> mondayShifts = workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(store.getId(), monday, monday)
                .stream().filter(s -> s.getEmployeeId().equals(emp.getId())).toList();
        assertThat(mondayShifts).isNotEmpty();
        workShiftRepository.deleteAll(mondayShifts);

        // 생성 구간을 더 미래로 확장해도, 이미 커서를 지난 월요일은 다시 만들어지지 않는다.
        EmployeeStoreRelation relation = relationRepository.findRelation(emp.getId(), store.getId()).orElseThrow();
        workShiftService.listForStore(store.getId(), hireDate, LocalDate.now().plusWeeks(6));

        boolean recreated = workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(store.getId(), monday, monday)
                .stream().anyMatch(s -> s.getEmployeeId().equals(emp.getId()));
        assertThat(recreated).isFalse();
    }

    @Test
    @DisplayName("이미 수동으로 시프트가 있는 미래 날짜는 고정 스케줄 생성이 건드리지 않는다(중복 없음)")
    void doesNotDuplicateExistingManualShift() {
        Store store = store();
        LocalDate hireDate = LocalDate.now();
        EmployeeProfile emp = employee("fixed4@x.com");
        relate(emp, store, hireDate);
        LaborContract contract = monthlySalaryContract(emp, store, hireDate);

        LocalDate nextMonday = hireDate.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.MONDAY));
        // 사장이 미리 그 날짜에 다른 시각으로 수동 등록해 둔 상태를 시뮬레이션.
        workShiftRepository.save(WorkShift.create(
                emp.getId(), store.getId(), nextMonday, LocalTime.of(9, 0), LocalTime.of(13, 0), "수동 등록"));

        fixedScheduleService.activateFromContract(contract);

        List<WorkShift> onThatDay = workShiftRepository
                .findByStoreIdAndShiftDateBetweenOrderByShiftDateAsc(store.getId(), nextMonday, nextMonday)
                .stream().filter(s -> s.getEmployeeId().equals(emp.getId())).toList();
        assertThat(onThatDay).hasSize(1);
        assertThat(onThatDay.get(0).getStartTime()).isEqualTo(LocalTime.of(9, 0)); // 수동 등록값 유지
    }
}
