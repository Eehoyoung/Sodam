package com.rich.sodam.config;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.service.PayrollBatchExecutor;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Phase 8(DB_OPTIMIZATION_PLAN.md §3 Phase 8, 시나리오 B) — 급여 배치 처리시간 실측.
 *
 * <p>{@link LoadTestSeedRunner}(같은 {@code loadtest} 프로필)가 만든 데이터 위에서, 직원 수를 늘려가며
 * {@link PayrollBatchExecutor#calculateForEmployee}(Phase 5가 REQUIRES_NEW로 분할한 실행 단위)를
 * 반복 호출해 총 소요시간·직원당 평균을 측정한다. {@code @Order}로 시더 다음에 실행되도록 보장한다.</p>
 *
 * <p>두 구간을 서로 다른 급여 기간(달1/달2)으로 측정해 "이미 계산됨" 충돌 없이 두 규모(100명 vs 전체)를
 * 한 번의 부팅으로 비교할 수 있게 했다 — Phase 5 이전(단일 대형 트랜잭션) 구조와 직접 비교하려면 별도
 * 빌드가 필요하지만, 이 측정만으로도 "이전 구조라면 락을 총 소요시간만큼 통째로 들고 있었을 것"이라는
 * 분석의 근거 수치(총 소요시간)를 제공한다 — 계획서 §Phase 8 실행 노트 참조.</p>
 */
@Slf4j
@Component
@Profile("loadtest")
@Order(10) // LoadTestSeedRunner(기본 Order) 다음에 실행
@RequiredArgsConstructor
public class LoadTestPayrollBenchmarkRunner implements CommandLineRunner {

    private final PayrollBatchExecutor payrollBatchExecutor;
    private final EntityManager entityManager;

    @Override
    public void run(String... args) {
        List<Store> stores = entityManager
                .createQuery("SELECT s FROM Store s WHERE s.storeName LIKE :prefix ORDER BY s.id", Store.class)
                .setParameter("prefix", "부하테스트매장%")
                .getResultList();
        if (stores.isEmpty()) {
            log.info("LoadTestPayrollBenchmark: 부하테스트 시드 데이터 없음 — 건너뜀 " +
                    "(LoadTestSeedRunner가 먼저 실행되어야 함)");
            return;
        }

        List<EmployeeStoreRelation> relations = entityManager
                .createQuery("SELECT r FROM EmployeeStoreRelation r WHERE r.store IN :stores ORDER BY r.id",
                        EmployeeStoreRelation.class)
                .setParameter("stores", stores)
                .getResultList();
        if (relations.isEmpty()) {
            log.info("LoadTestPayrollBenchmark: 시드된 직원 관계 없음 — 건너뜀");
            return;
        }

        // hireDate = historyStart - 7일(LoadTestSeedRunner 참조)이므로 historyStart는 그 값 + 7일로 역산.
        LocalDate historyStart = relations.get(0).getHireDate().plusDays(7);
        LocalDate period1Start = historyStart;
        LocalDate period1End = historyStart.plusMonths(1).minusDays(1);
        LocalDate period2Start = historyStart.plusMonths(1);
        LocalDate period2End = historyStart.plusMonths(2).minusDays(1);

        int smallTierSize = Math.min(100, relations.size());
        log.info("LoadTestPayrollBenchmark: 시작 — 총 시드 직원 {}명, 소규모 tier={}명(기간 {}~{}), " +
                        "전체 tier={}명(기간 {}~{})",
                relations.size(), smallTierSize, period1Start, period1End,
                relations.size(), period2Start, period2End);

        runTier("소규모(" + smallTierSize + "명)", relations.subList(0, smallTierSize), period1Start, period1End);
        runTier("전체(" + relations.size() + "명)", relations, period2Start, period2End);

        log.info("LoadTestPayrollBenchmark: 완료 — 위 로그의 '총 소요시간'이 Phase 5 이전(단일 대형 " +
                "트랜잭션) 구조였다면 그대로 하나의 트랜잭션·락 보유시간이었을 값이다. Phase 5 이후에는 " +
                "같은 총 작업량을 REQUIRES_NEW N개로 쪼개 개별 락 보유시간을 '총 소요시간/N' 수준으로 줄였다.");
    }

    private void runTier(String label, List<EmployeeStoreRelation> targets, LocalDate start, LocalDate end) {
        long tierStart = System.currentTimeMillis();
        int success = 0;
        int failed = 0;
        long maxSingleMs = 0;
        for (EmployeeStoreRelation relation : targets) {
            long t0 = System.currentTimeMillis();
            try {
                payrollBatchExecutor.calculateForEmployee(
                        relation.getEmployeeProfile().getId(), relation.getStore().getId(), start, end);
                success++;
            } catch (Exception e) {
                failed++;
            }
            long elapsed = System.currentTimeMillis() - t0;
            if (elapsed > maxSingleMs) {
                maxSingleMs = elapsed;
            }
        }
        long totalMs = System.currentTimeMillis() - tierStart;
        double avgMs = targets.isEmpty() ? 0 : (double) totalMs / targets.size();
        log.info("LoadTestPayrollBenchmark[{}]: 총 소요시간={}ms, 직원당 평균={}ms, 최대(단건)={}ms, " +
                        "성공={}, 실패={}",
                label, totalMs, String.format("%.1f", avgMs), maxSingleMs, success, failed);
    }
}
