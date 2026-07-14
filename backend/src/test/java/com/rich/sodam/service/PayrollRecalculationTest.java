package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.PayrollDetail;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollDetailRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 급여 재계산(recalculate) 버그 재현·검증(2026-07-14 Phase3 재실측 발견).
 *
 * <p>수정 전에는 recalculate=true 로 이미 계산된 기간을 다시 계산하면 {@code Payroll} 이 항상
 * 새로 생성되어 {@code uq_payroll_employee_store_period}(V50) 유니크 제약을 위반해 500(HTTP)/
 * {@code AssertionFailure}/{@code UnexpectedRollbackException} 이 발생했고, 매장 일괄 계산은
 * 자기호출로 트랜잭션을 공유해 한 직원의 실패가 이후 모든 직원을 연쇄 실패시켰다.</p>
 *
 * <p>주의: {@link PayrollBatchExecutor}/{@link PayrollStoreBatchService} 경로는 직원마다
 * {@code REQUIRES_NEW} 로 독립된 물리 트랜잭션을 연다 — {@code FixedScheduleServiceTest} 와 동일한
 * 패턴으로, 이 테스트 클래스의 {@code @Transactional} 롤백과 무관하게 실제로 커밋된다. 매 테스트가
 * 고유한 사업자번호/이메일을 사용해 서로 간섭하지 않게 한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollRecalculationTest {

    @Autowired private PayrollService payrollService;
    @Autowired private PayrollStoreBatchService payrollStoreBatchService;
    @Autowired private PayrollPolicyService payrollPolicyService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private PayrollRepository payrollRepository;
    @Autowired private PayrollDetailRepository payrollDetailRepository;

    // JUnit5 는 테스트 메서드마다 이 클래스의 새 인스턴스를 만들기 때문에 인스턴스 필드 seq는 매번 0부터
    // 다시 시작한다 — 문제 없어 보이지만, storeBatch 테스트가 TestTransaction으로 실제 커밋을 남기면
    // (REQUIRES_NEW 검증에 필요) 그 데이터가 이후 테스트에서 재사용되는 인스턴스 seq값과 사업자번호가
    // 겹쳐 유니크 제약 위반이 났다. static 카운터로 모든 인스턴스·테스트 메서드에 걸쳐 전역 유일성을 보장한다.
    private static final java.util.concurrent.atomic.AtomicLong SEQ =
            new java.util.concurrent.atomic.AtomicLong(System.nanoTime() % 100_000_000L);

    private Store newStore() {
        String biz = String.format("%010d", 1_000_000_000L + (SEQ.incrementAndGet() % 900_000_000L));
        Store s = new Store("재계산테스트매장", biz, "02-777-0000", "카페", 12000, 100);
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        return storeRepository.save(s);
    }

    private EmployeeProfile newEmployee(String emailPrefix) {
        User u = new User(emailPrefix + SEQ.incrementAndGet() + "@example.com", "재계산직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepository.save(u);
        return employeeProfileRepository.save(new EmployeeProfile(u));
    }

    private EmployeeStoreRelation relate(EmployeeProfile emp, Store store, int hourlyWage) {
        EmployeeStoreRelation rel = new EmployeeStoreRelation(emp, store, hourlyWage);
        rel.setIsActive(true);
        return relationRepository.save(rel);
    }

    private Attendance attend(EmployeeProfile emp, Store store, LocalDateTime checkOut, int hours, int hourlyWage) {
        Attendance a = new Attendance(emp, store);
        a.manualCheckIn(checkOut.minusHours(hours), 37.5665, 126.9780, hourlyWage);
        a.manualCheckOut(checkOut, 37.5665, 126.9780);
        return attendanceRepository.save(a);
    }

    @Test
    @DisplayName("같은 기간을 recalculate=true 로 재계산해도 유니크 제약 위반 없이 기존 급여가 갱신된다")
    void recalculate_updatesExistingPayroll_noUniqueViolation() {
        Store store = newStore();
        EmployeeProfile emp = newEmployee("recalc1_");
        EmployeeStoreRelation rel = relate(emp, store, 15_000);
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        LocalDateTime out = LocalDateTime.now();
        attend(emp, store, out, 8, rel.getAppliedHourlyWage());
        LocalDate start = out.toLocalDate().minusDays(1);
        LocalDate end = out.toLocalDate().plusDays(1);

        // 최초 계산
        Payroll first = payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, false);
        Long firstId = first.getId();
        int firstDetailCount = payrollDetailRepository.findByPayroll_IdOrderByWorkDateAsc(firstId).size();
        assertThat(firstDetailCount).isGreaterThan(0);

        // 재계산 — 수정 전에는 여기서 uq_payroll_employee_store_period 위반으로 예외가 터졌다.
        Payroll second = payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, true);

        assertThat(second.getId()).isEqualTo(firstId); // 새 행이 아니라 기존 행 갱신
        assertThat(second.getStatus()).isEqualTo(PayrollStatus.DRAFT);

        // 같은 기간에 대해 이 매장 급여 행이 정확히 1개만 존재 (중복 생성 없음)
        long countForPeriod = payrollRepository.findByEmployeeIdAndPeriod(emp.getId(), start, end).stream()
                .filter(p -> p.getStore().getId().equals(store.getId()))
                .count();
        assertThat(countForPeriod).isEqualTo(1);

        // 상세 내역도 중복 없이 재생성된 개수만 남음(payroll_detail.attendance_id UNIQUE 제약과도 충돌 없음)
        List<PayrollDetail> detailsAfter = payrollDetailRepository.findByPayroll_IdOrderByWorkDateAsc(firstId);
        assertThat(detailsAfter).hasSize(firstDetailCount);
    }

    @Test
    @DisplayName("recalculate=false 로 이미 계산된 기간을 다시 계산하면 기존 동작대로 거부된다")
    void recalculateFalse_onExisting_stillRejected() {
        Store store = newStore();
        EmployeeProfile emp = newEmployee("recalc2_");
        EmployeeStoreRelation rel = relate(emp, store, 15_000);
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        LocalDateTime out = LocalDateTime.now();
        attend(emp, store, out, 8, rel.getAppliedHourlyWage());
        LocalDate start = out.toLocalDate().minusDays(1);
        LocalDate end = out.toLocalDate().plusDays(1);

        payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, false);

        assertThatThrownBy(() -> payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, false))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("이미 지급완료(PAID)된 급여는 recalculate=true 라도 조용히 덮어쓰지 않고 거부된다")
    void recalculate_onPaidPayroll_isRejected() {
        Store store = newStore();
        EmployeeProfile emp = newEmployee("recalc3_");
        EmployeeStoreRelation rel = relate(emp, store, 15_000);
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        LocalDateTime out = LocalDateTime.now();
        attend(emp, store, out, 8, rel.getAppliedHourlyWage());
        LocalDate start = out.toLocalDate().minusDays(1);
        LocalDate end = out.toLocalDate().plusDays(1);

        Payroll payroll = payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, false);
        Payroll paid = payrollService.issuePayroll(payroll.getId()); // DRAFT -> CONFIRMED -> PAID 원자 처리
        assertThat(paid.getStatus()).isEqualTo(PayrollStatus.PAID);

        assertThatThrownBy(() -> payrollService.calculatePayroll(emp.getId(), store.getId(), start, end, true))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo("PAYROLL_ALREADY_FINALIZED"));
    }

    @Test
    @DisplayName("매장 일괄 재계산 — 한 직원의 계산 실패가 다른 직원의 계산에 영향을 주지 않는다")
    void storeBatch_oneEmployeeFailure_doesNotBlockOthers() {
        Store store = newStore();

        // 정상 직원(시급제)
        EmployeeProfile okEmp = newEmployee("recalc4_ok_");
        EmployeeStoreRelation okRel = relate(okEmp, store, 15_000);
        payrollPolicyService.getPayrollPolicyByStore(store.getId());

        LocalDateTime out = LocalDateTime.now();
        attend(okEmp, store, out, 8, okRel.getAppliedHourlyWage());
        LocalDate start = out.toLocalDate().minusDays(1);
        LocalDate end = out.toLocalDate().plusDays(1);

        // 결함 데이터 주입: 월급제로 표시했지만 monthlySalary 미설정 → 이 직원만 계산 시 BusinessException
        EmployeeProfile badEmp = newEmployee("recalc4_bad_");
        EmployeeStoreRelation badRel = relate(badEmp, store, 15_000);
        badRel.setEmploymentType(EmploymentType.MONTHLY_SALARY); // monthlySalary는 null로 남겨 결함 유발
        relationRepository.save(badRel);
        attend(badEmp, store, out, 8, badRel.getAppliedHourlyWage());

        // PayrollBatchExecutor 는 직원마다 REQUIRES_NEW 로 완전히 별도의 물리 커넥션/트랜잭션을 연다.
        // 이 테스트 메서드의 @Transactional(아직 커밋 안 됨) 안에서 만든 매장/직원 데이터는 그 별도
        // 커넥션에서는 보이지 않는다(READ_COMMITTED) — 운영에서는 이 데이터가 이미 커밋된 뒤 API 요청이
        // 오는 것과 동일한 상황을 재현하기 위해 여기서 명시적으로 커밋한다(FixedScheduleServiceTest 의
        // REQUIRES_NEW 검증과 동일한 필요성, 이 클래스는 TestTransaction 유틸로 처리).
        org.springframework.test.context.transaction.TestTransaction.flagForCommit();
        org.springframework.test.context.transaction.TestTransaction.end();
        org.springframework.test.context.transaction.TestTransaction.start();

        List<PayrollDto> results = payrollStoreBatchService.calculatePayrollForStore(store.getId(), start, end);

        // 결함 직원은 결과에서 빠지고, 정상 직원은 성공적으로 계산·저장된다(연쇄 실패 없음).
        assertThat(results).extracting(PayrollDto::getEmployeeId).containsExactly(okEmp.getId());

        List<Payroll> okSaved = payrollRepository.findByEmployeeIdAndPeriod(okEmp.getId(), start, end).stream()
                .filter(p -> p.getStore().getId().equals(store.getId()))
                .toList();
        assertThat(okSaved).hasSize(1);

        List<Payroll> badSaved = payrollRepository.findByEmployeeIdAndPeriod(badEmp.getId(), start, end).stream()
                .filter(p -> p.getStore().getId().equals(store.getId()))
                .toList();
        assertThat(badSaved).isEmpty();
    }
}
