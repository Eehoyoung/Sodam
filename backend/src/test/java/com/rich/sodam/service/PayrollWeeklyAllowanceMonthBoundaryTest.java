package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 월 경계에 걸친 주(週)의 주휴수당 귀속을 검증한다.
 *
 * <p><b>고정하려는 규칙</b>({@code PayrollService.calculateTotalWeeklyAllowance} Javadoc):
 * "주 종료일(주휴일)이 정산월에 속하는 주만, 그 주 전체로 산정해 전액 귀속. 분할·중복 금지."</p>
 *
 * <p>이 규칙에는 검증 공백이 있었다 — {@code .claude/rules/testing.md} 가 급여 변경 시 요구하는
 * "월말일 정산주기" 경계값 테스트가 이 케이스에 없었다. 주휴수당 노무정합 트랙
 * ({@code docs/260809/260809_주휴수당_노무정합_계획서.md} P-6)에서 식별된 항목이며,
 * <b>이 테스트는 급여액을 바꾸지 않으므로 G-7/G-8 게이트와 무관하게 먼저 추가한다.</b>
 * WP-P1(계약서 주휴일 반영) 착수 전에 현재 동작을 고정해두는 안전망 역할을 한다.</p>
 *
 * <p><b>기준 달력(2026년)</b>
 * <pre>
 *   주 A : 7/20(월) ~ 7/26(일)   근무 7/20~7/24    → 주 종료일 7월  → 7월 귀속
 *   주 B : 7/27(월) ~ 8/ 2(일)   근무 7/27~7/31    → 주 종료일 8월  → 8월 귀속  ← 경계주
 *   주 C : 8/ 3(월) ~ 8/ 9(일)   근무 8/ 3~8/ 7    → 주 종료일 8월  → 8월 귀속
 * </pre>
 * 핵심은 <b>주 B의 근무일이 전부 7월인데도 8월 급여에 잡힌다</b>는 것이다.</p>
 *
 * <p>주의: Mockito 사용 금지 — 실제 컴포넌트를 사용한 통합 테스트로 작성
 * ({@code PayrollServiceTest} 와 동일 방침).</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollWeeklyAllowanceMonthBoundaryTest {

    private static final int HOURLY_WAGE = 15_000;
    /** 주 40h 개근 → 법정 8h 분 주휴수당 (min(40/40 × 8, 8) × 시급). */
    private static final int ONE_WEEK_ALLOWANCE = 8 * HOURLY_WAGE;

    private static final LocalDate JULY_START = LocalDate.of(2026, 7, 1);
    private static final LocalDate JULY_END = LocalDate.of(2026, 7, 31);
    private static final LocalDate AUGUST_START = LocalDate.of(2026, 8, 1);
    private static final LocalDate AUGUST_END = LocalDate.of(2026, 8, 31);

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
        User user = userRepository.save(new User("weekly-boundary@example.com", "월경계테스트직원"));
        employee = employeeProfileRepository.save(new EmployeeProfile(user));

        store = new Store("월경계테스트매장", "1122334455", "02-1122-3344", "카페", HOURLY_WAGE, 100);
        store.updateLocation(37.5665, 126.9780, "서울특별시 강남구 테스트로 1", 100);
        store = storeRepository.save(store);

        relation = employeeStoreRelationRepository.save(
                new EmployeeStoreRelation(employee, store, HOURLY_WAGE));
    }

    @Test
    @DisplayName("경계주(7/27~8/2)는 근무일이 전부 7월이어도 8월에 귀속되고, 7월에서는 제외된다")
    void 경계주는_주종료일이_속한_8월에_귀속된다() {
        // Given — 경계주 근무만 생성 (7/27 월 ~ 7/31 금, 하루 8시간)
        workWeekdays(LocalDate.of(2026, 7, 27));

        // When
        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(), JULY_START, JULY_END);
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(), AUGUST_START, AUGUST_END);

        // Then — 근무는 전부 7월인데 주휴수당은 8월에 잡힌다
        assertThat(july.getWeeklyAllowance())
                .as("주 종료일(8/2)이 7월 밖이므로 7월 정산에서는 제외돼야 한다")
                .isZero();
        assertThat(august.getWeeklyAllowance())
                .as("근무일이 전부 7월이어도 주 종료일이 8월이면 8월에 전액 귀속된다")
                .isEqualTo(ONE_WEEK_ALLOWANCE);
    }

    @Test
    @DisplayName("경계주 주휴수당은 전월 근무분까지 포함한 주 전체(40h)로 산정된다")
    void 경계주는_주_전체_근로시간으로_산정된다() {
        // Given — 경계주에 40h(5일 × 8h) 근무. 8월에 속한 날(8/1 토, 8/2 일)은 근무 없음
        workWeekdays(LocalDate.of(2026, 7, 27));

        // When
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(), AUGUST_START, AUGUST_END);

        // Then — 8월 근무시간이 0인데도 40h 주 기준(법정 상한 8h) 금액이 나와야 한다.
        //        "정산월 내 출근일만 집계"됐다면 0h → 15h 미만 → 주휴수당 0 이 됐을 것이다.
        assertThat(august.getWeeklyAllowance())
                .as("정산월 내 근무일만 집계하면 0이 된다 — 주 전체를 봐야 40h 기준이 나온다")
                .isEqualTo(ONE_WEEK_ALLOWANCE);
    }

    @Test
    @DisplayName("연속 3주를 정산해도 각 주는 정확히 한 번만 귀속된다(중복·누락 없음)")
    void 연속_3주가_중복도_누락도_없이_한_번씩만_귀속된다() {
        // Given
        workWeekdays(LocalDate.of(2026, 7, 20)); // 주 A — 7월 귀속
        workWeekdays(LocalDate.of(2026, 7, 27)); // 주 B — 8월 귀속 (경계주)
        workWeekdays(LocalDate.of(2026, 8, 3));  // 주 C — 8월 귀속

        // When
        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(), JULY_START, JULY_END);
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(), AUGUST_START, AUGUST_END);

        // Then
        assertThat(july.getWeeklyAllowance())
                .as("7월에는 주 A 한 주만 귀속된다")
                .isEqualTo(ONE_WEEK_ALLOWANCE);
        assertThat(august.getWeeklyAllowance())
                .as("8월에는 경계주(B)와 주 C, 두 주가 귀속된다")
                .isEqualTo(2 * ONE_WEEK_ALLOWANCE);
        assertThat(july.getWeeklyAllowance() + august.getWeeklyAllowance())
                .as("두 달 합계가 정확히 3주치여야 한다 — 초과면 중복 귀속, 미달이면 누락")
                .isEqualTo(3 * ONE_WEEK_ALLOWANCE);
    }

    @Test
    @DisplayName("경계주가 없으면 전월·당월 어디에도 유령 주휴수당이 생기지 않는다")
    void 경계주가_없으면_귀속도_없다() {
        // Given — 7월 안에서 완결되는 주 하나만
        workWeekdays(LocalDate.of(2026, 7, 20)); // 주 A (7/20~7/26)

        // When
        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(), JULY_START, JULY_END);
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(), AUGUST_START, AUGUST_END);

        // Then
        assertThat(july.getWeeklyAllowance()).isEqualTo(ONE_WEEK_ALLOWANCE);
        assertThat(august.getWeeklyAllowance())
                .as("8월에 귀속될 주가 없으므로 0 이어야 한다")
                .isZero();
    }

    /**
     * 주어진 월요일부터 금요일까지 5일간 하루 8시간 근무 기록을 만든다.
     *
     * @param monday 주의 시작(월요일)
     */
    private void workWeekdays(LocalDate monday) {
        for (int offset = 0; offset < 5; offset++) {
            LocalDate day = monday.plusDays(offset);
            Attendance attendance = new Attendance(employee, store);
            LocalDateTime checkIn = day.atTime(9, 0);
            LocalDateTime checkOut = day.atTime(18, 0).minusHours(1); // 9~17시 = 8시간

            checkOut = checkOut.plusHours(1); // preserve 8 payable hours after the statutory break
            attendance.manualCheckIn(checkIn, 37.5665, 126.9780, relation.getAppliedHourlyWage());
            attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
            attendanceRepository.save(attendance);
        }
    }
}
