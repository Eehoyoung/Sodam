package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.StoreRole;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * 매장당 매니저 상한 2명이 동시 임명 경합에서도 지켜지는지 검증 — 잔여 슬롯을 두고 여러 스레드가
 * 동시에 임명해도 store 행 선잠금({@code StoreRepository.findByIdForUpdate}) 덕분에 초과 임명이
 * 발생하지 않아야 한다. {@link StoreEmployeeCountConcurrencyTest}와 같은 구성:
 * 클래스에 {@code @Transactional}을 걸지 않아 각 스레드가 실제 커밋으로 경합하고,
 * {@code @DirtiesContext}로 전용 H2 컨텍스트에 격리한다.
 *
 * <p>매장 소유·기능 플래그 검증은 이 테스트의 관심사가 아니므로 가드와 플랜 판정은 mock으로 통과시킨다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StoreManagerConcurrencyTest {

    @Autowired private StoreManagerService storeManagerService;
    @Autowired private StoreManagementServiceImpl storeManagementService;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;

    @MockBean private StoreAccessGuard storeAccessGuard;
    @MockBean private PlanAccessService planAccessService;

    @Test
    @DisplayName("동시 임명 3건 중 정확히 2건만 성공하고 매니저 수는 상한 2를 넘지 않는다")
    void concurrentAppointmentsNeverExceedManagerCap() throws Exception {
        when(planAccessService.storeOwnerHasFeature(anyLong(), eq(PlanFeature.MANAGER_DELEGATION)))
                .thenReturn(true);

        Store store = storeRepository.save(new Store("동시성매니저매장", "9998887771", "02-8", "카페", 12_000, 100));
        Long storeId = store.getId();

        int candidateCount = 3; // 상한(2) + 1 — 초과분 1건이 반드시 거부되어야 한다
        List<Long> employeeIds = IntStream.range(0, candidateCount)
                .mapToObj(i -> {
                    User u = new User("concurrent_mgr_" + i + "@x.com", "동시매니저후보" + i);
                    u.setUserGrade(UserGrade.EMPLOYEE);
                    Long userId = userRepository.saveAndFlush(u).getId();
                    storeManagementService.assignUserToStoreAsEmployee(userId, storeId);
                    return userId;
                })
                .collect(Collectors.toList());

        AtomicInteger rejected = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(candidateCount);
        try {
            List<CompletableFuture<Void>> futures = employeeIds.stream()
                    .map(employeeId -> CompletableFuture.runAsync(() -> {
                        try {
                            storeManagerService.draftAppointment(1L, storeId, employeeId, null);
                        } catch (IllegalStateException e) {
                            // 상한 초과 거부만 허용되는 실패 경로 — 그 외 예외는 테스트 실패로 드러나야 한다
                            if (!e.getMessage().contains("최대 2명")) throw e;
                            rejected.incrementAndGet();
                        }
                    }, pool))
                    .collect(Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdown();
            pool.awaitTermination(10, TimeUnit.SECONDS);
        }

        long managerCount = relationRepository.countByStore_IdAndStoreRoleAndIsActiveTrue(storeId, StoreRole.MANAGER);
        assertThat(rejected.get()).isEqualTo(1);
        assertThat(managerCount).isEqualTo(2);
    }
}
