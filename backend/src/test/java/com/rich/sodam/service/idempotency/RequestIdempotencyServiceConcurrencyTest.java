package com.rich.sodam.service.idempotency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * H-3 — execute() 가 isProcessed() 확인과 markProcessed() 기록을 나눠 하던 check-then-act 라,
 * 같은 idempotencyKey 로 동시에 들어온 두 요청이 모두 "미처리"로 판정돼 onFirstCall 을 두 번
 * 실행할 수 있었다. 급여 확정·결제 같은 금전 작업에서는 그게 곧 이중 처리다.
 */
class RequestIdempotencyServiceConcurrencyTest {

    private RequestIdempotencyService service() {
        return new RequestIdempotencyService(new InMemoryIdempotencyKeyStore());
    }

    @RepeatedTest(20)
    @DisplayName("같은 키로 동시에 들어온 두 요청 중 onFirstCall 은 정확히 1번만 실행된다")
    void concurrentRequestsRunFirstCallExactlyOnce() throws Exception {
        RequestIdempotencyService service = service();
        AtomicInteger firstCallCount = new AtomicInteger();
        AtomicInteger replayCount = new AtomicInteger();

        int threads = 8;
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        ExecutorService pool = Executors.newFixedThreadPool(threads);

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.execute("key-1", "payroll-issue:10", () -> {
                        firstCallCount.incrementAndGet();
                        // 실제 처리에는 시간이 걸린다 — check 와 mark 사이의 창을 재현한다.
                        try {
                            Thread.sleep(20);
                        } catch (InterruptedException ignored) {
                            Thread.currentThread().interrupt();
                        }
                        return "first";
                    }, () -> {
                        replayCount.incrementAndGet();
                        return "replay";
                    });
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertThat(done.await(10, TimeUnit.SECONDS)).isTrue();
        pool.shutdownNow();

        assertThat(firstCallCount.get()).isEqualTo(1);
        assertThat(replayCount.get()).isEqualTo(threads - 1);
    }

    @Test
    @DisplayName("첫 실행이 실패하면 클레임을 놓아준다 — 재시도가 영구히 막히면 안 된다")
    void failedFirstCallReleasesClaim() {
        RequestIdempotencyService service = service();
        AtomicInteger attempts = new AtomicInteger();

        assertThatThrownBy(() -> service.execute("key-2", "scope", () -> {
            attempts.incrementAndGet();
            throw new IllegalStateException("일시적 장애");
        }, () -> "replay")).isInstanceOf(IllegalStateException.class);

        String result = service.execute("key-2", "scope", () -> {
            attempts.incrementAndGet();
            return "ok";
        }, () -> "replay");

        assertThat(result).isEqualTo("ok");
        assertThat(attempts.get()).isEqualTo(2);
    }
}
