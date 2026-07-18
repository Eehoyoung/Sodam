package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * 월별 급여 계산 배치 오케스트레이션(DB_OPTIMIZATION_PLAN.md §2.8(e), Phase 5).
 *
 * <p>원래 {@code PayrollService.calculateMonthlyPayrolls()}에 있던 스케줄러 진입점을 이 클래스로
 * 옮겼다 — 이 클래스 자체에는 {@code @Transactional}을 두지 않는다(순수 오케스트레이션 루프). 실제
 * 트랜잭션은 {@link PayrollBatchExecutor#calculateForEmployee}가 직원 1명 단위로 {@code REQUIRES_NEW}로
 * 새로 연다. 예전에는 이 메서드 자체가 {@code @Transactional}이었고 안에서 자기호출로
 * {@code calculatePayroll}을 부르는 구조라 — Spring AOP 프록시가 자기호출을 우회해 안쪽
 * {@code @Transactional}이 사실상 무시되고, 매장×직원 전체가 하나의 대형 트랜잭션으로 묶여 락을 오래
 * 들고 있었다(제3자 검토 지적, §2.8(e) 참조).</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayrollMonthlyBatchScheduler {

    private final StoreRepository storeRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollBatchExecutor payrollBatchExecutor;

    /**
     * 월별 급여 계산 스케줄러.
     * 매월 1일 01:00에 실행되어 지난 달의 급여를 계산한다.
     */
    @Scheduled(cron = "0 0 1 1 * ?")
    public void calculateMonthlyPayrolls() {
        // 지난 달의 시작일과 종료일 계산
        YearMonth previousMonth = YearMonth.now().minusMonths(1);
        LocalDate startDate = previousMonth.atDay(1);
        LocalDate endDate = previousMonth.atEndOfMonth();

        log.info("월별 급여 계산 시작: {} ~ {}", startDate, endDate);

        // 모든 매장 조회
        List<Store> stores = storeRepository.findAll();

        for (Store store : stores) {
            // 매장의 모든 직원 관계 조회
            List<EmployeeStoreRelation> relations = employeeStoreRelationRepository.findByStore(store);

            for (EmployeeStoreRelation relation : relations) {
                try {
                    // 급여 계산 — 직원 1명당 독립 트랜잭션(REQUIRES_NEW)으로 실행
                    payrollBatchExecutor.calculateForEmployee(
                            relation.getEmployeeProfile().getId(), store.getId(), startDate, endDate);
                    log.info("급여 계산 완료: 직원ID={}, 매장ID={}", relation.getEmployeeProfile().getId(), store.getId());
                } catch (Exception e) {
                    // 직원 1명의 실패가 이미 커밋된 다른 직원의 결과나 이후 반복에 영향을 주지 않는다
                    // (REQUIRES_NEW로 각자 독립 트랜잭션이라 여기서 잡아도 이전 커밋은 유지됨).
                    log.error("급여 계산 실패: 직원ID={}, 매장ID={}, 오류={}",
                            relation.getEmployeeProfile().getId(), store.getId(), e.getMessage(), e);
                }
            }
        }

        log.info("월별 급여 계산 완료");
    }
}
