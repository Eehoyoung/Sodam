package com.rich.sodam.config;

import com.rich.sodam.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Phase 8(DB_OPTIMIZATION_PLAN.md §3 Phase 8) 부하테스트용 현실 규모 시드 데이터 생성기 — 오케스트레이션.
 *
 * <p>매장 1개 단위 실제 저장 로직은 {@link LoadTestStoreSeeder}(별도 빈, {@code @Transactional})에 있다 —
 * 이 클래스에서 자기호출하면 AOP 프록시를 우회해 트랜잭션이 걸리지 않는다({@link LoadTestStoreSeeder}
 * Javadoc 참조, {@link com.rich.sodam.service.PayrollMonthlyBatchScheduler}와 동일 패턴).</p>
 *
 * <p><b>운영 안전 가드</b>: {@code @Profile("loadtest")}로 하드 게이팅한다 — "loadtest" 프로필을 명시적으로
 * 활성화하지 않는 한 어떤 환경에서도(운영 포함) 이 코드가 로드조차 되지 않는다. {@code prod}만 활성화된
 * 상태에서는 이 빈이 존재하지 않으므로 실수로 운영 DB에 대고 돌릴 방법이 없다 — 반드시
 * {@code SPRING_PROFILES_ACTIVE=prod,loadtest}처럼 loadtest를 별도로 추가해야 실행된다.</p>
 *
 * <p>규모는 env로 조정한다(기본값은 이번 세션의 로컬 실측 예산에 맞춘 축소 규모 —
 * {@code SODAM_LOADTEST_STORES}=50, {@code SODAM_LOADTEST_EMPLOYEES_PER_STORE}=20,
 * {@code SODAM_LOADTEST_HISTORY_MONTHS}=2. 계획서 원안 규모(매장 500·직원 1만·6개월)로 재현하려면 이
 * 값들을 올려서 재실행하면 된다 — 로직은 규모에 무관하게 동일하다).</p>
 *
 * <p>이미 시드된 상태(마커 매장 존재)면 재실행 시 아무것도 하지 않는다(멱등) — DevSeedRunner와 동일한
 * 패턴.</p>
 */
@Slf4j
@Component
@Profile("loadtest")
@Order(1) // LoadTestPayrollBenchmarkRunner(@Order(10))보다 먼저 실행되도록 낮은 값 지정
@RequiredArgsConstructor
public class LoadTestSeedRunner implements CommandLineRunner {

    private static final String MARKER_EMAIL = "loadtest-owner-0@sodam.load";

    @Value("${SODAM_LOADTEST_STORES:50}")
    private int storeCount;

    @Value("${SODAM_LOADTEST_EMPLOYEES_PER_STORE:20}")
    private int employeesPerStore;

    @Value("${SODAM_LOADTEST_HISTORY_MONTHS:2}")
    private int historyMonths;

    @Value("${SODAM_LOADTEST_SEED_PASSWORD:sodamLoad1234}")
    private String seedPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;
    private final LoadTestStoreSeeder storeSeeder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(MARKER_EMAIL).isPresent()) {
            log.info("LoadTestSeed: 이미 시드됨 — 건너뜀 (재시드하려면 DB 초기화 후 재실행)");
            return;
        }

        long startedAt = System.currentTimeMillis();
        log.info("LoadTestSeed: 시작 — 매장 {}개 × 매장당 직원 {}명 = 총 직원 {}명, 출퇴근 이력 {}개월",
                storeCount, employeesPerStore, storeCount * employeesPerStore, historyMonths);

        // 비밀번호 해시는 1회만 계산해 재사용 — BCrypt는 의도적으로 느려서(부하테스트 목적 외) 매 유저마다
        // 새로 encode()하면 시드 자체가 병목이 된다(실제 회원가입 경로는 여전히 매번 encode 하므로 보안
        // 저하 없음 — 이건 시드 스크립트 전용 최적화).
        String passwordHash = passwordEncoder.encode(seedPassword);

        for (int s = 0; s < storeCount; s++) {
            storeSeeder.seedOneStore(s, employeesPerStore, historyMonths, passwordHash);
            if (s % 10 == 9) {
                entityManager.clear();
                log.info("LoadTestSeed: 매장 {}/{} 완료", s + 1, storeCount);
            }
        }
        entityManager.clear();

        long elapsedSec = (System.currentTimeMillis() - startedAt) / 1000;
        log.info("LoadTestSeed: 완료 — {}초 소요. 마커 계정={}, 비번=SODAM_LOADTEST_SEED_PASSWORD",
                elapsedSec, MARKER_EMAIL);
    }
}
