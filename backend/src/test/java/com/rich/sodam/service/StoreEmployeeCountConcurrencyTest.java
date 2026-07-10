package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 2(DB_OPTIMIZATION_PLAN.md §2.8(a)) 동시 요청 시뮬레이션 — 같은 매장에 여러 직원이 거의 동시에
 * 입사할 때, 활성 인원수(five_or_more_employees) 재계산이 lost update 없이 최종적으로 정확한지 검증한다.
 *
 * <p>클래스에 {@code @Transactional}을 걸지 않는다 — 걸면 테스트 전체가 하나의(롤백되는) 트랜잭션에
 * 묶여 각 서비스 호출이 실제로 커밋되지 않으므로, 동시 스레드 간 실제 DB 레벨 경합을 재현할 수 없다.</p>
 *
 * <p>{@code @DirtiesContext}로 이 테스트만 전용 Spring 컨텍스트(전용 H2 인메모리 DB)를 새로 띄운다 —
 * 전체 스위트 실행 시 캐시된 컨텍스트를 다른 테스트 수백 개와 공유하면, 이 테스트가 만드는 7-스레드
 * 동시 커밋이 그 시점까지 누적된 다른 테스트들의 커넥션 풀 경합과 겹쳐 드물게 H2 IDENTITY 채번이
 * 충돌하는 현상을 관찰했다(단독 실행 시 100% 통과, 전체 스위트 중 1회 관찰 — Phase 5 세션에서 발견,
 * 이 클래스가 검증하는 비관적 락 로직 자체의 결함은 아님). 전용 컨텍스트로 격리해 재현 조건을 없앤다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StoreEmployeeCountConcurrencyTest {

    @Autowired private StoreManagementServiceImpl service;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    @Test
    @DisplayName("동시 입사 N건 처리 후 활성 인원수와 5인 이상 플래그가 정확히 일치한다")
    void concurrentJoinsProduceCorrectFinalCount() throws Exception {
        Store store = storeRepository.save(new Store("동시성매장", "9998887770", "02-9", "카페", 12_000, 100));
        Long storeId = store.getId();

        int employeeCount = 7; // 5인 기준을 넘기는 인원수로 설정 — 재계산 결과(true) 검증까지 겸함
        List<Long> userIds = IntStream.range(0, employeeCount)
                .mapToObj(i -> {
                    User u = new User("concurrent_emp_" + i + "@x.com", "동시직원" + i);
                    u.setUserGrade(UserGrade.EMPLOYEE);
                    return userRepository.saveAndFlush(u).getId();
                })
                .collect(Collectors.toList());

        ExecutorService pool = Executors.newFixedThreadPool(employeeCount);
        try {
            List<CompletableFuture<Void>> futures = userIds.stream()
                    .map(userId -> CompletableFuture.runAsync(
                            () -> service.assignUserToStoreAsEmployee(userId, storeId), pool))
                    .collect(Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdown();
            pool.awaitTermination(10, TimeUnit.SECONDS);
        }

        long actualActiveCount = relationRepository.countByStoreAndIsActiveTrue(
                storeRepository.findById(storeId).orElseThrow());
        Store finalStore = storeRepository.findById(storeId).orElseThrow();

        assertThat(actualActiveCount).isEqualTo(employeeCount);
        assertThat(finalStore.getFiveOrMoreEmployees()).isTrue();
    }
}
