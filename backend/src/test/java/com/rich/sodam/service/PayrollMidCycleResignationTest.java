package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.PayrollBatchResultDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 정산기간 도중 퇴사(관계 비활성) 시의 현재 동작을 고정한다.
 *
 * <p><b>왜 필요한가</b>: G-9 해소 시 세무 축 검토가 "정산기간 도중 퇴사 시 그 주의 최종정산 처리"를
 * <b>미확인</b>으로 남겼다({@code docs/RELEASE_GATES.md} G-9 잔여). 질의하려면 먼저 시스템이
 * 실제로 무엇을 하는지 확정해야 한다. 이 테스트는 <b>판단이 아니라 현재 동작의 기록</b>이다.</p>
 *
 * <p><b>확인된 사실</b>
 * <ol>
 *   <li>이 시스템에는 <b>퇴사일(業務상 날짜)이 없다.</b> {@code EmployeeStoreRelation.changeActive(false)}가
 *       {@code isActive=false} 와 처리 <i>시각</i>({@code deactivatedAt})만 남긴다. 급여 계산에
 *       퇴사일이 전달되는 경로 자체가 없다</li>
 *   <li>그래서 월급제는 {@code MonthlySalaryCalculator.proratedBaseSalary(..., hireDate)} 가
 *       <b>입사 방향으로만 일할</b>한다 — 중도 퇴사자에게 <b>월급 전액</b>이 지급된다</li>
 *   <li>반대로 매장 일괄 정산({@link PayrollStoreBatchService})은 {@code isActive=true} 만 대상으로
 *       삼아 퇴사자를 <b>성공 목록에도 실패 목록에도 넣지 않고 조용히 건너뛴다</b> — 사장이
 *       미정산을 인지할 단서가 응답에 없다(근로기준법 §36 금품청산 14일과 맞물리는 지점)</li>
 * </ol>
 * 즉 두 경로가 서로 반대 방향으로 어긋나 있다. 개별 계산은 과다지급 쪽, 일괄 정산은 미지급 쪽이다.
 * 어느 쪽을 정답으로 삼을지는 노무·세무 회신 사항이라 여기서는 고치지 않고 고정만 한다.</p>
 *
 * <p>주의: {@link PayrollStoreBatchService} 는 직원마다 {@code REQUIRES_NEW} 로 독립 트랜잭션을 연다 —
 * 이 클래스의 {@code @Transactional} 안에서 만든 데이터는 그 커넥션에서 보이지 않으므로
 * {@link TestTransaction} 으로 명시 커밋한다({@code PayrollRecalculationTest} 와 동일 패턴).
 * 그 때문에 매 테스트가 전역 유일한 사업자번호·이메일을 쓴다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollMidCycleResignationTest {

    private static final int MONTHLY_SALARY = 2_200_000;
    private static final int HOURLY_WAGE = 15_000;

    /** 정산기간 2026-08-01 ~ 2026-08-31, 퇴사 처리 2026-08-15. */
    private static final LocalDate PERIOD_START = LocalDate.of(2026, 8, 1);
    private static final LocalDate PERIOD_END = LocalDate.of(2026, 8, 31);
    private static final LocalDate LAST_WORKING_DAY = LocalDate.of(2026, 8, 14);
    private static final LocalDate HIRED_LONG_AGO = LocalDate.of(2025, 1, 1);

    private static final AtomicLong SEQ = new AtomicLong(System.nanoTime() % 100_000_000L);

    @Autowired private PayrollService payrollService;
    @Autowired private PayrollStoreBatchService payrollStoreBatchService;
    @Autowired private PayrollPolicyService payrollPolicyService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private AttendanceRepository attendanceRepository;

    @Test
    @DisplayName("월급제 직원이 정산기간 도중 퇴사해도 개별 계산은 월급 전액을 지급한다(일할계산 없음)")
    void 월급제_중도퇴사자에게_월급_전액이_지급된다() {
        // Given — 8/14 까지만 근무하고 퇴사 처리된 월급제 직원
        Store store = newStore();
        payrollPolicyService.getPayrollPolicyByStore(store.getId());
        EmployeeStoreRelation relation = monthlyEmployee(store, "resign-monthly");
        workWeekdaysUntil(relation, PERIOD_START, LAST_WORKING_DAY);

        relation.changeActive(false);
        relationRepository.save(relation);

        // When — 사장이 이 직원 한 명을 개별 정산한다
        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        // Then — 절반만 재직했는데 기본급이 월급 전액이다.
        //        proratedBaseSalary 는 hireDate(입사 방향)만 보고, 퇴사일을 받는 파라미터가 없다.
        assertThat(payroll.getRegularWage())
                .as("퇴사일이 계산에 전달되지 않아 일할되지 않는다 — 세무·노무 회신 대상")
                .isEqualTo(MONTHLY_SALARY);
        assertThat(payroll.getGrossWage()).isGreaterThanOrEqualTo(MONTHLY_SALARY);
    }

    @Test
    @DisplayName("시급제 중도퇴사자는 실근무분만 지급된다(대조군 — 여기는 어긋나지 않는다)")
    void 시급제_중도퇴사자는_실근무분만_지급된다() {
        // Given
        Store store = newStore();
        payrollPolicyService.getPayrollPolicyByStore(store.getId());
        EmployeeStoreRelation relation = hourlyEmployee(store, "resign-hourly");
        int workedDays = workWeekdaysUntil(relation, PERIOD_START, LAST_WORKING_DAY);

        relation.changeActive(false);
        relationRepository.save(relation);

        // When
        Payroll payroll = payrollService.calculatePayroll(
                relation.getEmployeeProfile().getId(), store.getId(), PERIOD_START, PERIOD_END);

        // Then — 실제 출근한 날의 시간만 지급된다. 퇴사 이후 기간이 임금으로 잡히지 않는다.
        assertThat(payroll.getRegularHours())
                .as("8/1~8/14 평일 근무분만 집계돼야 한다")
                .isEqualTo(workedDays * 8.0);
        assertThat(payroll.getRegularWage()).isEqualTo(workedDays * 8 * HOURLY_WAGE);
    }

    @Test
    @DisplayName("일괄 정산은 근무기록이 있는 퇴사자를 수동 정산 필요로 보고한다(T-13)")
    void 일괄정산은_근무기록_있는_퇴사자를_보고한다() {
        // Given — 같은 매장에 재직자 1명 + 정산기간 도중 퇴사자 1명
        Store store = newStore();
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        EmployeeStoreRelation active = hourlyEmployee(store, "batch-active");
        workWeekdaysUntil(active, PERIOD_START, LAST_WORKING_DAY);

        EmployeeStoreRelation resigned = hourlyEmployee(store, "batch-resigned");
        workWeekdaysUntil(resigned, PERIOD_START, LAST_WORKING_DAY);
        resigned.changeActive(false);
        relationRepository.save(resigned);

        Long activeId = active.getEmployeeProfile().getId();
        Long resignedId = resigned.getEmployeeProfile().getId();

        // REQUIRES_NEW 로 열리는 배치 트랜잭션에서 보이도록 명시 커밋한다.
        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();

        // When
        PayrollBatchResultDto result =
                payrollStoreBatchService.calculatePayrollForStore(store.getId(), PERIOD_START, PERIOD_END);

        // Then — 계산은 재직자만. 퇴사자는 계산하지 않되 "수동 정산 필요"로 반드시 보고된다.
        assertThat(result.getData()).extracting(PayrollDto::getEmployeeId)
                .contains(activeId)
                .as("퇴사일이 없어 월급제 일할·퇴사 주 주휴 규칙이 미확정이므로 자동 계산하지 않는다(G-15)")
                .doesNotContain(resignedId);
        assertThat(result.getFailed())
                .as("보고되지 않으면 사장님이 미정산을 인지할 단서가 없다 — §36 금품청산 14일")
                .anySatisfy(f -> {
                    assertThat(f.getEmployeeId()).isEqualTo(resignedId);
                    assertThat(f.getErrorCode())
                            .isEqualTo(PayrollStoreBatchService.RESIGNED_NEEDS_MANUAL_SETTLEMENT);
                });
    }

    @Test
    @DisplayName("근무기록이 없는 퇴사자는 보고하지 않는다(과거 퇴사자로 경고가 무의미해지는 것 방지)")
    void 근무기록_없는_퇴사자는_보고하지_않는다() {
        // Given — 퇴사자이지만 이 정산기간에는 출근 기록이 없다
        Store store = newStore();
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        EmployeeStoreRelation active = hourlyEmployee(store, "batch-active2");
        workWeekdaysUntil(active, PERIOD_START, LAST_WORKING_DAY);

        EmployeeStoreRelation longGone = hourlyEmployee(store, "batch-longgone");
        longGone.changeActive(false);
        relationRepository.save(longGone);

        Long longGoneId = longGone.getEmployeeProfile().getId();

        TestTransaction.flagForCommit();
        TestTransaction.end();
        TestTransaction.start();

        // When
        PayrollBatchResultDto result =
                payrollStoreBatchService.calculatePayrollForStore(store.getId(), PERIOD_START, PERIOD_END);

        // Then — 정산할 것이 없으므로 조용히 넘어간다.
        //        매달 과거 퇴사자 전원을 경고로 띄우면 경고 자체가 무시된다.
        assertThat(result.getFailed())
                .extracting(PayrollBatchResultDto.FailedEmployee::getEmployeeId)
                .doesNotContain(longGoneId);
        assertThat(result.getData())
                .extracting(PayrollDto::getEmployeeId)
                .doesNotContain(longGoneId);
    }

    @Test
    @DisplayName("퇴사 처리는 isActive·처리시각만 남기고, 급여 계산에 쓸 퇴사일을 남기지 않는다")
    void 퇴사_처리는_퇴사일을_남기지_않는다() {
        Store store = newStore();
        EmployeeStoreRelation relation = monthlyEmployee(store, "resign-fields");

        relation.changeActive(false);

        assertThat(relation.getIsActive()).isFalse();
        assertThat(relation.getDeactivatedAt())
                .as("남는 것은 '언제 처리했는지'뿐이다 — 근로관계 종료일(업무상 날짜)이 아니다")
                .isNotNull();
        assertThat(relation.getHireDate())
                .as("일할계산이 참조하는 날짜는 입사일 하나뿐이다")
                .isEqualTo(HIRED_LONG_AGO);
    }

    // ── 픽스처 ────────────────────────────────────────────────

    private Store newStore() {
        String biz = String.format("%010d", 1_000_000_000L + (SEQ.incrementAndGet() % 900_000_000L));
        Store s = new Store("중도퇴사테스트매장", biz, "02-888-0000", "카페", HOURLY_WAGE, 100);
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        return storeRepository.save(s);
    }

    private EmployeeStoreRelation monthlyEmployee(Store store, String emailPrefix) {
        EmployeeStoreRelation relation = new EmployeeStoreRelation(newEmployee(emailPrefix), store);
        relation.setEmploymentType(EmploymentType.MONTHLY_SALARY);
        relation.setMonthlySalary(MONTHLY_SALARY);
        relation.setContractedWeeklyDays(5);
        relation.setHireDate(HIRED_LONG_AGO);
        relation.setIsActive(true);
        return relationRepository.save(relation);
    }

    private EmployeeStoreRelation hourlyEmployee(Store store, String emailPrefix) {
        EmployeeStoreRelation relation = new EmployeeStoreRelation(newEmployee(emailPrefix), store, HOURLY_WAGE);
        relation.setHireDate(HIRED_LONG_AGO);
        relation.setIsActive(true);
        return relationRepository.save(relation);
    }

    private EmployeeProfile newEmployee(String emailPrefix) {
        User u = new User(emailPrefix + SEQ.incrementAndGet() + "@example.com", "중도퇴사직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return employeeProfileRepository.save(new EmployeeProfile(userRepository.save(u)));
    }

    /**
     * {@code from} 부터 {@code to} 까지의 평일에 하루 8시간(유급) 근무 기록을 만든다.
     *
     * @return 만들어진 근무일 수
     */
    private int workWeekdaysUntil(EmployeeStoreRelation relation, LocalDate from, LocalDate to) {
        int days = 0;
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            if (day.getDayOfWeek().getValue() >= 6) {
                continue; // 주말 제외
            }
            Attendance attendance = new Attendance(relation.getEmployeeProfile(), relation.getStore());
            LocalDateTime checkIn = day.atTime(9, 0);
            attendance.manualCheckIn(checkIn, 37.5665, 126.9780, relation.getAppliedHourlyWage());
            attendance.manualCheckOut(checkIn.plusHours(9), 37.5665, 126.9780); // 휴게 1h → 유급 8h
            attendanceRepository.save(attendance);
            days++;
        }
        return days;
    }
}
