package com.rich.sodam.service;

import com.rich.sodam.core.payroll.wage.WorkScheduleDay;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TimeOffLeaveType;
import com.rich.sodam.domain.type.TimeOffStatus;
import com.rich.sodam.domain.type.TimeOffUnit;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.TimeOffResponse;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 휴가 신청 승인/거부 워크플로 테스트 — 잔여 연차 검증(승인)·사유 필수(거부).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TimeOffServiceTest {

    @Autowired private TimeOffService timeOffService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private LaborContractRepository laborContractRepository;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 5556667770L + (bizSeq++));
        return storeRepository.save(new Store("휴가매장", biz, "02-777-8888", "카페", 12_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    /** 5인 채우기용 더미 직원(입사일이 짧아도 무방 — fiveOrMore 판정에만 관여). */
    private void fillToFiveEmployees(Store store) {
        for (int i = 0; i < 4; i++) {
            EmployeeProfile filler = employee("filler" + bizSeq + "_" + i + "@x.com", "동료" + i);
            EmployeeStoreRelation rel = new EmployeeStoreRelation(filler, store, 12_000);
            rel.setHireDate(LocalDate.now().minusMonths(2));
            rel.setIsActive(true);
            relationRepository.save(rel);
        }
    }

    private EmployeeProfile employeeWithOneYearTenure(Store store, String email, String name) {
        EmployeeProfile emp = employee(email, name);
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, 12_000);
        rel.setHireDate(LocalDate.now().minusYears(1).minusDays(10));
        rel.setIsActive(true);
        relationRepository.save(rel);
        return emp;
    }

    @Test
    @DisplayName("잔여 연차가 충분하면 승인이 성공한다")
    void approve_withSufficientBalance_succeeds() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "ok@x.com", "정상직원");

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), "여름휴가");

        TimeOffResponse approved = timeOffService.approveTimeOffRequest(created.id());

        assertThat(approved.status()).isEqualTo(TimeOffStatus.APPROVED);
        assertThat(approved.consumedDays()).isEqualTo(3.0);
    }

    @Test
    @DisplayName("잔여 연차보다 많은 연차(ANNUAL) 신청을 승인하려 하면 예외가 발생한다")
    void approve_withInsufficientBalance_throws() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "over@x.com", "초과직원");

        // 1년차 발생 연차 15일보다 많은 20일 신청
        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(30), LocalDate.now().plusDays(49), "장기휴가");

        assertThatThrownBy(() -> timeOffService.approveTimeOffRequest(created.id()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("잔여 연차");
    }

    @Test
    @DisplayName("무급휴가(UNPAID)는 잔여 연차와 무관하게 승인할 수 있다")
    void approve_unpaidLeave_skipsBalanceCheck() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "unpaid@x.com", "무급직원");

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.UNPAID, TimeOffUnit.FULL_DAY,
                LocalDate.now().plusDays(30), LocalDate.now().plusDays(60), null, null, "장기 무급휴직");

        TimeOffResponse approved = timeOffService.approveTimeOffRequest(created.id());

        assertThat(approved.status()).isEqualTo(TimeOffStatus.APPROVED);
    }

    @Test
    @DisplayName("반차 신청은 0.5일로 환산된다")
    void halfDay_consumesHalfDay() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "half@x.com", "반차직원");

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.ANNUAL, TimeOffUnit.HALF_DAY,
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(5), null, null, "반차");

        assertThat(created.consumedDays()).isEqualTo(0.5);
    }

    @Test
    @DisplayName("반차 신청은 시작일과 종료일이 달라지면 거부된다(여러 날짜에 걸친 반차 방지)")
    void halfDay_acrossMultipleDates_throws() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "halfmulti@x.com", "다일반차직원");

        assertThatThrownBy(() -> timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.ANNUAL, TimeOffUnit.HALF_DAY,
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(11), null, null, "일주일 반차"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("시간 단위 신청은 소정근로시간 기준으로 환산된다(기본 8시간)")
    void hoursUnit_convertsToFractionOfDay() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "hours@x.com", "시간단위직원");

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.ANNUAL, TimeOffUnit.HOURS,
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(5),
                LocalTime.of(9, 0), LocalTime.of(13, 0), "반나절 외출");

        assertThat(created.consumedDays()).isEqualTo(0.5); // 4시간 / 기본 8시간
    }

    @Test
    @DisplayName("같은 기간에 이미 대기/승인된 신청이 있으면 새 신청이 거부된다")
    void overlappingRequest_throws() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "overlap@x.com", "중복신청직원");

        timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), "여름휴가");

        assertThatThrownBy(() -> timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(11), LocalDate.now().plusDays(15), "겹치는 신청"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("거부된 신청과 겹치는 기간은 다시 신청할 수 있다")
    void overlappingWithRejected_isAllowed() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "rejectedoverlap@x.com", "재신청직원");

        TimeOffResponse first = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), "여름휴가");
        timeOffService.rejectTimeOffRequest(first.id(), "인력 공백 우려");

        TimeOffResponse resubmitted = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), "재신청");

        assertThat(resubmitted.status()).isEqualTo(TimeOffStatus.PENDING);
    }

    @Test
    @DisplayName("같은 날 시간단위 신청이라도 시각 구간이 겹치지 않으면 허용된다")
    void nonOverlappingHoursOnSameDay_isAllowed() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "amPm@x.com", "오전오후직원");

        timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.ANNUAL, TimeOffUnit.HOURS,
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(5),
                LocalTime.of(9, 0), LocalTime.of(11, 0), "오전 외출");

        TimeOffResponse afternoon = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.ANNUAL, TimeOffUnit.HOURS,
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(5),
                LocalTime.of(14, 0), LocalTime.of(16, 0), "오후 외출");

        assertThat(afternoon.status()).isEqualTo(TimeOffStatus.PENDING);
    }

    @Test
    @DisplayName("거부 시 사유가 없으면 예외가 발생한다")
    void reject_withoutReason_throws() {
        Store store = store();
        EmployeeProfile emp = employee("norsn@x.com", "무사유직원");
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, 12_000);
        rel.setIsActive(true);
        relationRepository.save(rel);

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(1), LocalDate.now().plusDays(1), "개인사정");

        assertThatThrownBy(() -> timeOffService.rejectTimeOffRequest(created.id(), " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> timeOffService.rejectTimeOffRequest(created.id(), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("거부 사유를 입력하면 REJECTED 로 전환되고 사유가 저장된다")
    void reject_withReason_setsRejectedAndReason() {
        Store store = store();
        EmployeeProfile emp = employee("rsn@x.com", "사유직원");
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, 12_000);
        rel.setIsActive(true);
        relationRepository.save(rel);

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(1), LocalDate.now().plusDays(1), "개인사정");

        TimeOffResponse rejected = timeOffService.rejectTimeOffRequest(
                created.id(), "성수기라 대체 인력 확보가 어려워요");

        assertThat(rejected.status()).isEqualTo(TimeOffStatus.REJECTED);
        assertThat(rejected.rejectReason()).isEqualTo("성수기라 대체 인력 확보가 어려워요");
    }

    @Test
    @DisplayName("근로계약서 스케줄이 있으면 종일 휴가는 소정근로일만 차감된다(주말·비근무일 제외)")
    void fullDay_consumesOnlyScheduledWorkDays() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "sched@x.com", "스케줄직원");

        LaborContract contract = new LaborContract();
        contract.setEmployeeId(emp.getId());
        contract.setStoreId(store.getId());
        contract.setWorkSchedule(List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(18, 0), null, null),
                new WorkScheduleDay(DayOfWeek.WEDNESDAY, LocalTime.of(9, 0), LocalTime.of(18, 0), null, null),
                new WorkScheduleDay(DayOfWeek.FRIDAY, LocalTime.of(9, 0), LocalTime.of(18, 0), null, null)));
        laborContractRepository.save(contract);

        // 다음다음 주 월요일부터 7일(월~일) — 소정근로일(월·수·금) 3일만 차감돼야 한다.
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusWeeks(1);

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), monday, monday.plusDays(6), "일주일 휴가");

        assertThat(created.consumedDays()).isEqualTo(3.0);
    }

    @Test
    @DisplayName("근로계약서 스케줄이 없으면 종일 휴가는 기존대로 역일수로 차감된다(회귀 방지)")
    void fullDay_withoutSchedule_fallsBackToCalendarDays() {
        Store store = store();
        fillToFiveEmployees(store);
        EmployeeProfile emp = employeeWithOneYearTenure(store, "noSched@x.com", "무스케줄직원");

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), LocalDate.now().plusDays(10), LocalDate.now().plusDays(16), "일주일 휴가");

        assertThat(created.consumedDays()).isEqualTo(7.0);
    }

    @Test
    @DisplayName("이미 처리된 신청은 다시 승인/거부할 수 없다")
    void alreadyProcessed_cannotBeReprocessed() {
        Store store = store();
        EmployeeProfile emp = employee("done@x.com", "완료직원");
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, 12_000);
        rel.setIsActive(true);
        relationRepository.save(rel);

        TimeOffResponse created = timeOffService.createTimeOffRequest(
                emp.getId(), store.getId(), TimeOffLeaveType.UNPAID, TimeOffUnit.FULL_DAY,
                LocalDate.now().plusDays(1), LocalDate.now().plusDays(1), null, null, "무급");
        timeOffService.approveTimeOffRequest(created.id());

        assertThatThrownBy(() -> timeOffService.approveTimeOffRequest(created.id()))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> timeOffService.rejectTimeOffRequest(created.id(), "사유"))
                .isInstanceOf(IllegalStateException.class);
    }
}
