package com.rich.sodam.config;

import com.rich.sodam.config.app.AppProperties;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * dev 프로필 전용 시드 데이터.
 *
 * 에뮬레이터에서 즉시 로그인 가능하도록 다음 계정·매장을 생성한다:
 *   - 사장: owner@sodam.dev (MASTER, BUSINESS 구독)
 *   - 직원: staff@sodam.dev (EMPLOYEE)
 *   - 매장: 소담 데모 매장 (서울 중구 좌표, 반경 500m, 시급 12,000)
 *
 * 보안 가드:
 *   - {@code @Profile("dev")} 로 운영(prod)에서는 절대 실행 안 됨.
 *   - {@code sodam.dev.seed.enabled=false} 로 staging 등 노출 환경에서 비활성화 가능 (기본 활성).
 *   - 시드 비밀번호는 {@code SODAM_DEV_SEED_PASSWORD} 로 주입 — 코드에 평문 상수를 두지 않는다.
 *     (로컬 편의를 위한 기본값은 있으나, 공유 환경에서는 반드시 override 권장)
 */
@Slf4j
@Component
@Profile("dev")
@ConditionalOnProperty(prefix = "sodam.dev.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DevSeedRunner implements CommandLineRunner {

    @Value("${SODAM_DEV_SEED_PASSWORD:sodam1234}")
    private String seedPassword;

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final MasterProfileRepository masterProfileRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final SubscriptionService subscriptionService;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final com.rich.sodam.repository.PayrollPolicyRepository payrollPolicyRepository;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) {
        if (userRepository.findByEmail("owner@sodam.dev").isPresent()) {
            log.info("DevSeed: 데이터 이미 존재 — 건너뜀");
            return;
        }
        log.info("DevSeed: 데모 데이터 생성 시작");

        // saveAndFlush 로 ID 확정 + 영속성 컨텍스트 정리 (MapsId 의 detached 회피)
        User owner = userRepository.saveAndFlush(buildUser("owner@sodam.dev", "사장님(데모)", UserGrade.MASTER));
        User staff = userRepository.saveAndFlush(buildUser("staff@sodam.dev", "지훈(데모)", UserGrade.EMPLOYEE));

        // owner/staff 를 다시 fetch 해서 managed 상태 보장
        owner = userRepository.findById(owner.getId()).orElseThrow();
        staff = userRepository.findById(staff.getId()).orElseThrow();

        MasterProfile masterProfile = new MasterProfile(owner);
        masterProfileRepository.save(masterProfile);

        EmployeeProfile employeeProfile = new EmployeeProfile(staff);
        employeeProfileRepository.save(employeeProfile);

        Store store = new Store(
                "소담 데모 카페",
                "1234567890",
                "02-555-1234",
                "음식점",
                12_000,
                appProperties.getStore().getDefaultRadius() * 5 // 500m 반경 (에뮬레이터 GPS 흔들림 보정)
        );
        // 서울 중구 (시청 인근) - 카카오맵 좌표
        store.updateLocation(37.5665, 126.9780, "서울특별시 중구 세종대로 110", store.getRadius());
        store.setAddressDetails("서울특별시 중구 세종대로 110", "서울특별시 중구 태평로1가 31");
        store = storeRepository.save(store);

        masterStoreRelationRepository.save(new MasterStoreRelation(masterProfile, store));
        employeeStoreRelationRepository.save(
                new EmployeeStoreRelation(employeeProfile, store, 12_000));

        // 급여 정책 시드 (소득세 3.3% + 한국 노동법 기본값)
        com.rich.sodam.domain.PayrollPolicy policy = new com.rich.sodam.domain.PayrollPolicy();
        policy.setStore(store);
        policy.setTaxPolicyType(com.rich.sodam.domain.type.TaxPolicyType.INCOME_TAX_3_3);
        policy.setNightWorkRate(1.5);
        policy.setOvertimeRate(1.5);
        policy.setRegularHoursPerDay(8.0);
        policy.setWeeklyAllowanceEnabled(true);
        policy.setNightWorkStartTime(java.time.LocalTime.of(22, 0));
        payrollPolicyRepository.save(policy);
        log.info("DevSeed: 급여 정책 시드 완료 (3.3% 원천징수, 야간/연장 1.5배)");

        // 사장에게 비즈니스 플랜 구독 부여 (Mock Toss 클라이언트로 빌링키 발급 → 첫 결제 성공)
        try {
            subscriptionService.subscribe(owner.getId(),
                    com.rich.sodam.domain.type.PlanType.BUSINESS,
                    "MOCK_AUTH_KEY_DEV_001");
            log.info("DevSeed: BUSINESS 구독 (Mock 결제) 생성 완료");
        } catch (Exception e) {
            log.warn("DevSeed: 유료 구독 시드 실패 — 무료로 폴백: {}", e.getMessage());
            subscriptionService.subscribeFree(owner.getId());
        }

        log.info("DevSeed: 완료 — owner=owner@sodam.dev / staff=staff@sodam.dev (비번=SODAM_DEV_SEED_PASSWORD), 매장 #{}",
                store.getId());
    }

    private User buildUser(String email, String name, UserGrade grade) {
        User u = new User();
        u.setEmail(email);
        u.setName(name);
        u.setUserGrade(grade);
        u.setPassword(passwordEncoder.encode(seedPassword));
        LocalDateTime now = LocalDateTime.now();
        u.setCreatedAt(now);
        u.setAgeConfirmedAt(now);
        u.setTermsAgreedAt(now);
        u.setPrivacyAgreedAt(now);
        u.setMarketingAgreedAt(now);
        return u;
    }
}
