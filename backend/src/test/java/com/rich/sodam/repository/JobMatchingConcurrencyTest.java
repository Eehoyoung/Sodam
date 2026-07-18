package com.rich.sodam.repository;

import com.rich.sodam.domain.JobApplication;
import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.JobCategory;
import com.rich.sodam.domain.type.JobWorkType;
import com.rich.sodam.domain.type.UserGrade;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * §10 Phase 5 동시성 리스크 1·3 — {@code JobOffer}/{@code JobApplication}의 "같은 매장(공고)→같은
 * 대상 PENDING 1건" 제약이 V54/V55의 생성 컬럼 기반 유니크 인덱스로 DB 레벨에서 실제로 보장되는지,
 * 두 요청을 {@link ExecutorService}로 실제 동시 발사해 검증한다(260711_작업통합.md Part 2 §10 Phase 5 DoD).
 *
 * <p>이 테스트가 실제로 레이스를 재현하는지(유니크 인덱스 없이 실행하면 두 건 모두 성공해 실패하는지)를
 * 먼저 인덱스 없는 상태로 확인한 뒤, V54/V55에 유니크 인덱스를 추가해 통과시키는 순서로 작업했다
 * (testing.md TDD 원칙).</p>
 *
 * <p>{@code @Transactional}을 클래스에 걸지 않는다 — 걸면 각 스레드 호출이 하나의(롤백되는) 트랜잭션에
 * 묶여 실제 DB 레벨 경합을 재현할 수 없다({@link com.rich.sodam.service.StoreEmployeeCountConcurrencyTest}
 * 와 동일 원칙). {@link CountDownLatch}로 두 스레드의 INSERT 타이밍을 강제로 겹치게 만들고, 여러 회
 * 반복해 레이스가 안정적으로(flaky하지 않게) 잡히는지 확인한다 — §10 Phase 5 DoD "최소 10회 반복 실행".</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class JobMatchingConcurrencyTest {

    /** DoD가 요구하는 "최소 10회 반복"을 만족하면서 스위트 실행 시간을 과도하게 늘리지 않는 반복 횟수. */
    private static final int ITERATIONS = 15;

    @Autowired
    private JobOfferRepository jobOfferRepository;
    @Autowired
    private JobApplicationRepository jobApplicationRepository;
    @Autowired
    private JobPostingRepository jobPostingRepository;
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("같은 매장→같은 구직자 JobOffer 동시 생성 2건 중 정확히 1건만 성공한다(V54 유니크 인덱스)")
    void concurrentJobOfferCreationAllowsOnlyOnePending() throws Exception {
        for (int i = 0; i < ITERATIONS; i++) {
            int iteration = i;
            Store store = storeRepository.save(
                    new Store("동시성제안매장" + iteration, String.format("111%07d", iteration),
                            "02-1000-000" + iteration, "카페", 12_000, 100));
            User target = userRepository.saveAndFlush(newUser("offer_target_" + iteration));

            RaceResult result = raceTwice(() -> jobOfferRepository.saveAndFlush(
                    JobOffer.propose(store, target, JobWorkType.SUBSTITUTE, null,
                            LocalTime.of(9, 0), LocalTime.of(18, 0), 12_000, "제안 " + iteration,
                            LocalDateTime.now().plusHours(24))));

            assertRaceProducedExactlyOneWinner(result, "offer iteration=" + i);

            List<JobOffer> rows = jobOfferRepository.findByStore_IdOrderByCreatedAtDesc(store.getId());
            assertThat(rows).as("iteration=%d 최종 저장된 JobOffer 행 수", i).hasSize(1);
        }
    }

    @Test
    @DisplayName("같은 공고→같은 지원자 JobApplication 동시 생성 2건 중 정확히 1건만 성공한다(V55 유니크 인덱스)")
    void concurrentJobApplicationCreationAllowsOnlyOnePending() throws Exception {
        for (int i = 0; i < ITERATIONS; i++) {
            int iteration = i;
            Store store = storeRepository.save(
                    new Store("동시성공고매장" + iteration, String.format("222%07d", iteration),
                            "02-2000-000" + iteration, "카페", 12_000, 100));
            JobPosting posting = jobPostingRepository.saveAndFlush(
                    JobPosting.create(store, JobWorkType.REGULAR, JobCategory.CAFE, null,
                            LocalTime.of(9, 0), LocalTime.of(18, 0), 12_000, "공고 " + iteration));
            User applicant = userRepository.saveAndFlush(newUser("applicant_" + iteration));

            RaceResult result = raceTwice(() -> jobApplicationRepository.saveAndFlush(
                    JobApplication.apply(posting, applicant, "지원 " + iteration)));

            assertRaceProducedExactlyOneWinner(result, "application iteration=" + i);

            List<JobApplication> rows = jobApplicationRepository.findByPosting_IdOrderByCreatedAtDesc(posting.getId());
            assertThat(rows).as("iteration=%d 최종 저장된 JobApplication 행 수", i).hasSize(1);
        }
    }

    private User newUser(String suffix) {
        User user = new User(suffix + "@sodam-concurrency.test", "동시성" + suffix);
        user.setUserGrade(UserGrade.EMPLOYEE);
        return user;
    }

    /** 두 스레드를 {@link CountDownLatch}로 동시에 출발시켜 같은 삽입 로직을 실제로 경합시킨다. */
    private RaceResult raceTwice(Runnable insert) throws InterruptedException {
        int threadCount = 2;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger conflictCount = new AtomicInteger();
        AtomicInteger otherFailureCount = new AtomicInteger();

        try {
            List<CompletableFuture<Void>> futures = IntStream.range(0, threadCount)
                    .mapToObj(t -> CompletableFuture.runAsync(() -> {
                        ready.countDown();
                        try {
                            start.await(5, TimeUnit.SECONDS);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }
                        try {
                            insert.run();
                            successCount.incrementAndGet();
                        } catch (DataIntegrityViolationException e) {
                            conflictCount.incrementAndGet();
                        } catch (RuntimeException e) {
                            otherFailureCount.incrementAndGet();
                        }
                    }, pool))
                    .collect(Collectors.toList());

            ready.await(5, TimeUnit.SECONDS);
            start.countDown();
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(30, TimeUnit.SECONDS);
        } catch (ExecutionException | TimeoutException e) {
            throw new IllegalStateException(e);
        } finally {
            pool.shutdown();
            pool.awaitTermination(10, TimeUnit.SECONDS);
        }

        return new RaceResult(successCount.get(), conflictCount.get(), otherFailureCount.get());
    }

    private void assertRaceProducedExactlyOneWinner(RaceResult result, String context) {
        assertThat(result.otherFailures())
                .as("예상 밖 예외 발생(%s) — DataIntegrityViolationException 이외 실패", context)
                .isZero();
        assertThat(result.successes())
                .as("동시 생성 중 성공 건수(%s)", context)
                .isEqualTo(1);
        assertThat(result.conflicts())
                .as("동시 생성 중 유니크 제약 위반으로 막힌 건수(%s)", context)
                .isEqualTo(1);
    }

    private record RaceResult(int successes, int conflicts, int otherFailures) {
    }
}
