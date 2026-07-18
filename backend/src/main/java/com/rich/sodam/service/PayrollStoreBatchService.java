package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 매장 활성 직원 전체에 대한 일괄 급여 계산 오케스트레이션 (사장 정산 플로우 PRD_OWNER S-301).
 *
 * <p>이전에는 이 오케스트레이션 루프가 {@code PayrollService.calculatePayrollForStore} 안에 있었고,
 * 같은 {@code @Transactional}(REQUIRED) 메서드 안에서 직원마다 {@code this.calculatePayroll(...)}를
 * 자기호출했다. 자기호출은 Spring AOP 프록시를 우회하므로 실질적으로 모든 직원이 "하나의" 트랜잭션을
 * 공유했고, 한 직원의 저장 실패(예: 유니크 제약 위반)가 트랜잭션을 rollback-only 로 마킹해 이후 순서의
 * 다른 모든 직원까지 {@code UnexpectedRollbackException} 으로 연쇄 실패시켰다(2026-07-14 Phase3
 * 재실측 발견 — 재계산 요청 1건이 매장 전체 정산을 500 으로 날림).</p>
 *
 * <p>월별 배치({@link PayrollMonthlyBatchScheduler})와 동일한 패턴으로, 직원 1명당
 * {@link PayrollBatchExecutor#calculateForEmployee(Long, Long, LocalDate, LocalDate, boolean)}를
 * {@code REQUIRES_NEW} 독립 트랜잭션으로 호출한다. {@code PayrollService}에 직접 의존하지 않고
 * {@code PayrollBatchExecutor}(단방향: 실행기 → PayrollService)만 의존해 순환 참조를 피한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollStoreBatchService {

    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollBatchExecutor payrollBatchExecutor;

    /**
     * 매장 활성 직원 전체에 대한 일괄 급여 계산.
     * recalculate=true 고정(정산 마법사에서 같은 기간을 다시 계산하는 용도) — 기존-급여 갱신/방어
     * (PAID·CONFIRMED 재계산 거부 등)는 {@code PayrollService.calculatePayroll}이 담당한다.
     * 직원 한 명의 계산 실패는 REQUIRES_NEW 독립 트랜잭션 덕분에 다른 직원에게 전혀 영향을 주지 않는다.
     */
    public List<PayrollDto> calculatePayrollForStore(Long storeId, LocalDate startDate, LocalDate endDate) {
        List<EmployeeStoreRelation> relations = employeeStoreRelationRepository
                .findByStore_Id(storeId).stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .toList();

        List<PayrollDto> result = new ArrayList<>();
        for (EmployeeStoreRelation rel : relations) {
            if (rel.getEmployeeProfile() == null) continue;
            Long employeeId = rel.getEmployeeProfile().getId();
            try {
                Payroll p = payrollBatchExecutor.calculateForEmployee(employeeId, storeId, startDate, endDate, true);
                result.add(PayrollDto.from(p));
            } catch (Exception e) {
                // REQUIRES_NEW 독립 트랜잭션이라 이미 커밋된 다른 직원의 결과에 영향을 주지 않는다.
                log.warn("매장 일괄 정산 실패 emp={} store={} reason={}",
                        employeeId, storeId, e.getMessage());
            }
        }
        return result;
    }
}
