package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 급여 배치(월별 스케줄러 + 매장 일괄 정산)의 직원 단위 실행 단위(DB_OPTIMIZATION_PLAN.md §2.8(e), Phase 5;
 * 매장 일괄 정산 recalculate 오버로드는 2026-07-14 Phase3 재실측 발견 버그 수정 — 아래 참고).
 *
 * <p>{@code PayrollMonthlyBatchScheduler}·{@code PayrollStoreBatchService}의 오케스트레이션 루프에서
 * 직원 1명씩 호출된다. {@code REQUIRES_NEW}로 매번 새 트랜잭션을 열어, 한 직원의 계산 실패가 다른
 * 직원의 이미 커밋된 결과에 영향을 주지 않고, 매장 전체 × 직원 전체를 하나의 트랜잭션으로 묶어 락을
 * 오래 들고 있던 문제를 없앤다.</p>
 *
 * <p>⚠️ 이 REQUIRES_NEW 분리가 없던 시절, {@code PayrollService.calculatePayrollForStore}는 같은
 * {@code @Transactional}(REQUIRED) 메서드 안에서 직원마다 {@code this.calculatePayroll(...)}를
 * 자기호출했다. 한 직원 저장이 실패(예: uq_payroll_employee_store_period 유니크 제약 위반)하면
 * 트랜잭션이 rollback-only 로 마킹되고, 이후 순서의 다른 모든 직원도 같은 트랜잭션이라
 * {@code UnexpectedRollbackException} 으로 연쇄 실패했다 — 매장 일괄 정산 하나가 전체를 500 으로
 * 날리던 버그. 이 실행기를 거치면 직원마다 완전히 독립된 물리 트랜잭션이라 이 문제가 없다.</p>
 *
 * <p>{@code PayrollService}와 별도 빈으로 분리한 이유 — 순환 의존 회피: 오케스트레이션 메서드가
 * {@code PayrollService} 안에 그대로 있으면 이 실행기가 {@code PayrollService}를 의존하고
 * {@code PayrollService}가 다시 이 실행기를 의존하는 순환 참조가 생긴다(생성자 주입으로는 해결 불가).
 * 오케스트레이션은 {@code PayrollMonthlyBatchScheduler}/{@code PayrollStoreBatchService}로 옮기고,
 * 이 실행기만 {@code PayrollService}를 단방향으로 의존하도록 설계했다.</p>
 */
@Service
@RequiredArgsConstructor
public class PayrollBatchExecutor {

    private final PayrollService payrollService;

    /**
     * 직원 1명의 급여를 독립 트랜잭션으로 계산한다 (recalculate=false — 월별 스케줄러 전용,
     * 이미 계산된 기간이면 예외를 던지고 스케줄러가 로그만 남긴다. 기존 동작 유지).
     *
     * <p>{@code PayrollService.calculatePayroll(...)}는 기존 {@code @Transactional}(전파 REQUIRED)을
     * 그대로 유지한다 — 다른 호출부(컨트롤러의 수동 계산, 테스트 등)의 트랜잭션 동작은 전혀 바뀌지
     * 않는다. 이 메서드가 REQUIRES_NEW로 새 트랜잭션을 먼저 시작해두면, 그 안에서 호출되는
     * {@code calculatePayroll}은 REQUIRED 의미대로 이 새 트랜잭션에 합류할 뿐이다.</p>
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Payroll calculateForEmployee(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate) {
        return payrollService.calculatePayroll(employeeId, storeId, startDate, endDate);
    }

    /**
     * 직원 1명의 급여를 독립 트랜잭션으로 계산한다 (recalculate 옵션 포함 — 매장 일괄 정산 전용).
     * 이미 계산된 기간이면 {@code PayrollService.calculatePayroll} 의 기존-급여 갱신/방어 로직
     * (PAID·CONFIRMED 재계산 거부 등)을 그대로 따른다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Payroll calculateForEmployee(Long employeeId, Long storeId, LocalDate startDate, LocalDate endDate,
                                         boolean recalculate) {
        return payrollService.calculatePayroll(employeeId, storeId, startDate, endDate, recalculate);
    }
}
