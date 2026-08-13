package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.MonthOffset;
import com.rich.sodam.domain.PayrollCycle;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 연도 경계를 걸치는 정산주기(예: 12/26~익년 1/25)의 현재 동작을 고정한다.
 *
 * <p><b>왜 필요한가</b>: G-9(주 40시간 초과 연장가산) 해소 시 세무 축 검토가
 * "연도 경계 정산주기에서 12월 근로분 가산임금이 연말정산 귀속연도 판단에 영향을 주는지"를
 * <b>미확인</b>으로 남겼다({@code docs/RELEASE_GATES.md} G-9 잔여). 세무사에게 "이렇게 동작하는데
 * 맞습니까"를 물으려면 먼저 동작이 무엇인지 확정돼 있어야 한다. 이 테스트는 <b>판단이 아니라
 * 현재 동작의 기록</b>이며, 회신으로 규칙이 바뀌면 여기가 먼저 빨개진다.</p>
 *
 * <p><b>확인된 사실</b>
 * <ol>
 *   <li>{@link PayrollCycle} 의 날짜 해석은 {@link YearMonth} 연산이라 연도 롤오버 자체는 정상이다
 *       — 12월/1월을 잘못 짚는 버그는 없다</li>
 *   <li>그 결과 <b>하나의 {@code Payroll} 행이 두 역년(曆年)에 걸친 근로를 담는다.</b>
 *       엔티티에 귀속연도를 분리해 담는 필드가 없고, 총액도 역년별로 쪼개지지 않는다</li>
 *   <li>주휴수당·주 40h 연장가산의 귀속 규칙("주 종료일이 속한 정산기간")도 그대로 적용돼,
 *       <b>12월 근로만으로 발생한 주의 가산임금이 이 정산기간(=지급일이 익년)에 귀속</b>된다</li>
 * </ol>
 * 즉 소득세법 시행령 §49①1호(근로소득 수입시기 = 근로제공일)를 엄격히 보면 12/26~12/31 근로분은
 * 전년도 귀속인데, 시스템은 이를 <b>정산기간 단위로만</b> 다룬다. 이 간극의 처리 방법이 세무 질의 대상이다.</p>
 *
 * <p><b>기준 달력</b> — 정산주기: 전월 26일 ~ 당월 25일, 기준월 2027-01
 * <pre>
 *   정산기간 : 2026-12-26(토) ~ 2027-01-25(월)
 *   주 X     : 2026-12-21(월) ~ 2026-12-27(일)  근무 12/21~12/25(금) 40h  → 주 종료일 12/27 → 이 기간 귀속
 *   주 Y     : 2026-12-28(월) ~ 2027-01-03(일)  근무 12/28~2027-01-01     → 주 종료일 1/3   → 이 기간 귀속
 * </pre>
 * 주 X 는 <b>근무일이 전부 2026년</b>인데, 지급은 2027년 정산기간에서 이뤄진다.</p>
 *
 * <p>주의: Mockito 사용 금지 — 실제 컴포넌트를 사용한 통합 테스트({@code PayrollServiceTest} 방침).</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollYearBoundaryCycleTest {

    private static final int HOURLY_WAGE = 15_000;
    /** 주 40h 개근 → 법정 8h 분 주휴수당. */
    private static final int ONE_WEEK_ALLOWANCE = 8 * HOURLY_WAGE;

    /** 연도를 걸치는 정산기간 — 2026-12-26 ~ 2027-01-25. */
    private static final LocalDate PERIOD_START = LocalDate.of(2026, 12, 26);
    private static final LocalDate PERIOD_END = LocalDate.of(2027, 1, 25);
    /** 직전 정산기간 — 2026-11-26 ~ 2026-12-25 (연도 안에서 완결). */
    private static final LocalDate PREV_PERIOD_START = LocalDate.of(2026, 11, 26);
    private static final LocalDate PREV_PERIOD_END = LocalDate.of(2026, 12, 25);

    @Autowired
    private PayrollService payrollService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EmployeeProfileRepository employeeProfileRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Autowired
    private AttendanceRepository attendanceRepository;

    private EmployeeProfile employee;
    private Store store;
    private EmployeeStoreRelation relation;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(new User("year-boundary@example.com", "연도경계테스트직원"));
        employee = employeeProfileRepository.save(new EmployeeProfile(user));

        store = new Store("연도경계테스트매장", "2233445566", "02-2233-4455", "카페", HOURLY_WAGE, 100);
        store.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 2", 100);
        store = storeRepository.save(store);

        relation = employeeStoreRelationRepository.save(
                new EmployeeStoreRelation(employee, store, HOURLY_WAGE));
    }

    @Test
    @DisplayName("정산주기 날짜 해석은 연도 경계를 정확히 넘는다(12월/1월 오인 없음)")
    void 정산주기가_연도_경계를_정확히_해석한다() {
        // Given — 전월 26일 시작 / 당월 25일 마감 / 당월 25일 지급
        PayrollCycle cycle = PayrollCycle.of(
                MonthOffset.PREV_MONTH, 26,
                MonthOffset.CURRENT_MONTH, 25, false,
                MonthOffset.CURRENT_MONTH, 25, false);

        // When — 기준월이 2027년 1월
        YearMonth january2027 = YearMonth.of(2027, 1);

        // Then — 시작일만 전년도로 넘어간다
        assertThat(cycle.resolveStart(january2027))
                .as("전월 기준이므로 2026년 12월로 넘어가야 한다")
                .isEqualTo(PERIOD_START);
        assertThat(cycle.resolveEnd(january2027)).isEqualTo(PERIOD_END);
        assertThat(cycle.resolvePayDate(january2027)).isEqualTo(PERIOD_END);

        // 그리고 역방향(날짜 → 기준월)도 같은 주기를 짚는다
        assertThat(cycle.cycleMonthContaining(LocalDate.of(2026, 12, 31)))
                .as("2026-12-31 은 2027년 1월 기준 주기에 속한다")
                .isEqualTo(january2027);
        assertThat(cycle.cycleMonthContaining(LocalDate.of(2026, 12, 25)))
                .as("2026-12-25 는 아직 직전(2026년 12월 기준) 주기다")
                .isEqualTo(YearMonth.of(2026, 12));
    }

    @Test
    @DisplayName("근무일이 전부 2026년인 주의 주휴수당·연장가산이 2027년 지급 정산기간에 귀속된다")
    void 전년도_근로분_가산임금이_익년_정산기간에_귀속된다() {
        // Given — 주 X(12/21~12/27): 월~금 40h. 근무일은 전부 2026년, 주 종료일도 2026년이지만
        //         그 날(12/27)이 2026-12-26 시작 정산기간 안에 있다.
        workWeekdays(LocalDate.of(2026, 12, 21));

        // When
        Payroll prev = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PREV_PERIOD_START, PREV_PERIOD_END);
        Payroll yearBoundary = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PERIOD_START, PERIOD_END);

        // Then — 직전 기간(마감 12/25)에서는 빠지고, 연도를 걸친 기간에 잡힌다
        assertThat(prev.getWeeklyAllowance())
                .as("주 종료일 12/27 이 마감 12/25 를 넘으므로 직전 정산기간에서는 제외된다")
                .isZero();
        assertThat(yearBoundary.getWeeklyAllowance())
                .as("근무일이 전부 2026년이어도 지급은 2027년 정산기간에서 이뤄진다")
                .isEqualTo(ONE_WEEK_ALLOWANCE);
    }

    @Test
    @DisplayName("하나의 Payroll 행이 두 역년의 근로를 함께 담고, 역년별로 분리되지 않는다")
    void 하나의_급여행이_두_역년_근로를_함께_담는다() {
        // Given — 2026년 근로(주 X)와 2027년 근로(주 Y)를 모두 만든다.
        //         주 Y(12/28~1/3)는 12/28~1/1 근무 — 두 해에 걸쳐 있다.
        workWeekdays(LocalDate.of(2026, 12, 21)); // 전부 2026년
        workWeekdays(LocalDate.of(2026, 12, 28)); // 2026-12-28 ~ 2027-01-01

        // When
        Payroll payroll = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PERIOD_START, PERIOD_END);

        // Then — 기간 자체가 두 해를 걸친다
        assertThat(payroll.getStartDate().getYear()).isEqualTo(2026);
        assertThat(payroll.getEndDate().getYear()).isEqualTo(2027);

        // 두 주 모두 이 한 행에 귀속된다 — 역년별 분리 필드가 없어 총액으로만 남는다
        assertThat(payroll.getWeeklyAllowance())
                .as("두 주 모두 주 종료일이 이 정산기간 안이라 함께 귀속된다")
                .isEqualTo(2 * ONE_WEEK_ALLOWANCE);
        assertThat(payroll.getGrossWage())
                .as("2026년 근로분과 2027년 근로분이 한 총액으로 합쳐진다")
                .isPositive();
    }

    @Test
    @DisplayName("주 40시간 초과 연장가산도 같은 귀속 규칙을 따른다(연도 경계에서 누락되지 않음)")
    void 주40시간_초과_연장가산도_연도_경계에서_누락되지_않는다() {
        // Given — 주 X 에 42h 근무(월~토 7h × 6일 = 42h). 일 8h 초과가 없으므로
        //         주 40h 초과분 2h 는 전부 "주 단위 가산"으로만 발생한다.
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = LocalDate.of(2026, 12, 21).plusDays(offset);
            workDay(day, 7);
        }

        // When
        Payroll prev = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PREV_PERIOD_START, PREV_PERIOD_END);
        Payroll yearBoundary = payrollService.calculatePayroll(
                employee.getId(), store.getId(), PERIOD_START, PERIOD_END);

        // Then — 앞 기간에서 빠지고 뒤 기간에 정확히 한 번 잡힌다(G-9 총액 가산 방식)
        assertThat(prev.getWeeklyOvertimeHours())
                .as("주 종료일이 직전 기간 밖이므로 여기서는 0")
                .isZero();
        assertThat(yearBoundary.getWeeklyOvertimeHours())
                .as("42h − 40h = 2h 가 연도를 걸친 정산기간에 귀속된다")
                .isEqualTo(2.0);
        assertThat(yearBoundary.getWeeklyOvertimeWage())
                .as("가산분 50% 만 더한다 — 15,000 × 2h × 0.5")
                .isEqualTo(15_000);
    }

    /** 주어진 월요일부터 금요일까지 5일간 하루 8시간(유급) 근무 기록을 만든다. */
    private void workWeekdays(LocalDate monday) {
        for (int offset = 0; offset < 5; offset++) {
            workDay(monday.plusDays(offset), 8);
        }
    }

    /** 하루치 근무 기록. 법정 휴게 1시간을 더해 유급시간이 {@code paidHours} 가 되게 한다. */
    private void workDay(LocalDate day, int paidHours) {
        Attendance attendance = new Attendance(employee, store);
        LocalDateTime checkIn = day.atTime(9, 0);
        LocalDateTime checkOut = checkIn.plusHours(paidHours + 1L); // 휴게 1h 포함
        attendance.manualCheckIn(checkIn, 37.5665, 126.9780, relation.getAppliedHourlyWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }
}
