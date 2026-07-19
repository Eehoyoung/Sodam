package com.rich.sodam.service.support;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-06: 트랜잭션이 없을 때 즉시 실행, 커밋 시 1회, 롤백 시 0회를 검증한다.
 * 실제 DB 트랜잭션 없이 {@link TransactionSynchronizationManager}를 직접 조작해
 * "활성 트랜잭션 여부"와 "커밋/롤백 콜백 트리거"를 시뮬레이션한다.
 */
class AfterCommitExecutorTest {

    private final AfterCommitExecutor executor = new AfterCommitExecutor();

    @AfterEach
    void cleanup() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void 활성_트랜잭션이_없으면_즉시_실행한다() {
        AtomicInteger runCount = new AtomicInteger(0);

        executor.execute(runCount::incrementAndGet);

        assertThat(runCount.get()).isEqualTo(1);
    }

    @Test
    void 활성_트랜잭션이_있으면_등록만_하고_즉시_실행하지_않는다() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            AtomicInteger runCount = new AtomicInteger(0);

            executor.execute(runCount::incrementAndGet);

            assertThat(runCount.get()).isZero();
            assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void 커밋되면_등록된_action이_정확히_1회_실행된다() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger runCount = new AtomicInteger(0);
        executor.execute(runCount::incrementAndGet);

        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
        TransactionSynchronizationManager.clearSynchronization();

        assertThat(runCount.get()).isEqualTo(1);
    }

    @Test
    void 롤백되면_action이_실행되지_않는다() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger runCount = new AtomicInteger(0);
        executor.execute(runCount::incrementAndGet);

        // 롤백 시뮬레이션: afterCommit()을 호출하지 않고 그대로 정리(afterCompletion(ROLLBACK)과 동등)
        TransactionSynchronizationManager.clearSynchronization();

        assertThat(runCount.get()).isZero();
    }

    @Test
    void 여러_action을_등록하면_커밋_후_등록_순서대로_전부_실행된다() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger counter = new AtomicInteger(0);
        AtomicInteger firstOrder = new AtomicInteger(-1);
        AtomicInteger secondOrder = new AtomicInteger(-1);

        executor.execute(() -> firstOrder.set(counter.getAndIncrement()));
        executor.execute(() -> secondOrder.set(counter.getAndIncrement()));

        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
        TransactionSynchronizationManager.clearSynchronization();

        assertThat(firstOrder.get()).isEqualTo(0);
        assertThat(secondOrder.get()).isEqualTo(1);
    }
}
