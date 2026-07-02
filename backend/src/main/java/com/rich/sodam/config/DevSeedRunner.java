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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * dev 프로필 전용 시드 데이터.
 *
 * 에뮬레이터에서 즉시 로그인 가능하도록 다음 계정·매장을 생성한다:
 *   - 사장: owner@sodam.dev (MASTER, PRO 구독)
 *   - 직원: staff@sodam.dev (EMPLOYEE) + emp1~9@sodam.dev (총 10명, 다양한 시급/입사일)
 *   - 매장: 소담 데모 카페 (서울 중구 좌표, 반경 500m, 시급 12,000)
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
        User owner = buildUser("owner@sodam.dev", "사장님(데모)", UserGrade.MASTER);
        owner.setPhone("010-1234-5678");
        owner.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
        owner.setProfileCompletedAt(LocalDateTime.now());
        owner = userRepository.saveAndFlush(owner);

        User staff = buildUser("staff@sodam.dev", "지훈(데모)", UserGrade.EMPLOYEE);
        staff.setPhone("010-9999-0001");
        staff.setBirthDate(java.time.LocalDate.of(1995, 5, 15));
        staff.setProfileCompletedAt(LocalDateTime.now());
        staff = userRepository.saveAndFlush(staff);

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
        EmployeeStoreRelation staffRel = new EmployeeStoreRelation(employeeProfile, store, 12_000);
        staffRel.setHireDate(LocalDate.now().minusMonths(3));
        staffRel.setContractedWeeklyDays(5);
        employeeStoreRelationRepository.save(staffRel);

        // 추가 더미 직원 9명 (다양한 시급·입사일·계약일수로 시연 경우의 수 극대화)
        seedExtraEmployees(store);

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

        // 사장에게 PRO 플랜 구독 부여 (Mock Toss 클라이언트로 빌링키 발급 → 첫 결제 성공)
        try {
            subscriptionService.subscribe(owner.getId(),
                    com.rich.sodam.domain.type.PlanType.PRO,
                    "MOCK_AUTH_KEY_DEV_001");
            log.info("DevSeed: PRO 구독 (Mock 결제) 생성 완료");
        } catch (Exception e) {
            log.warn("DevSeed: 유료 구독 시드 실패 — 무료로 폴백: {}", e.getMessage());
            subscriptionService.subscribeFree(owner.getId());
        }

        log.info("DevSeed: 완료 — owner=owner@sodam.dev / staff=staff@sodam.dev (비번=SODAM_DEV_SEED_PASSWORD), 매장 #{}",
                store.getId());
    }

    /** emp1~9@sodam.dev: 시급/입사일/계약일수 다양화 */
    private void seedExtraEmployees(Store store) {
        record EmpSpec(String email, String name, String phone, Integer wage, long hiresMonthsAgo, int weeklyDays) {}

        EmpSpec[] specs = {
            new EmpSpec("emp1@sodam.dev",  "김민지", "010-2001-0001",  9_860, 6,  3),
            new EmpSpec("emp2@sodam.dev",  "이서준", "010-2002-0002", 13_500, 12, 5),
            new EmpSpec("emp3@sodam.dev",  "박아라", "010-2003-0003", 10_500, 3,  4),
            new EmpSpec("emp4@sodam.dev",  "최태양", "010-2004-0004", 14_000, 24, 5),
            new EmpSpec("emp5@sodam.dev",  "윤나은", "010-2005-0005",  9_860, 0,  3),
            new EmpSpec("emp6@sodam.dev",  "정현우", "010-2006-0006", 12_500, 8,  5),
            new EmpSpec("emp7@sodam.dev",  "강지수", "010-2007-0007",   null, 1,  4),  // 매장 기준시급
            new EmpSpec("emp8@sodam.dev",  "조재원", "010-2008-0008", 15_000, 18, 6),
            new EmpSpec("emp9@sodam.dev",  "한소희", "010-2009-0009", 11_000, 4,  4),
        };

        for (EmpSpec s : specs) {
            User u = buildUser(s.email(), s.name(), UserGrade.EMPLOYEE);
            u.setPhone(s.phone());
            u.setProfileCompletedAt(LocalDateTime.now());
            u = userRepository.saveAndFlush(u);
            u = userRepository.findById(u.getId()).orElseThrow();

            EmployeeProfile ep = new EmployeeProfile(u);
            employeeProfileRepository.save(ep);

            EmployeeStoreRelation rel = (s.wage() != null)
                    ? new EmployeeStoreRelation(ep, store, s.wage())
                    : new EmployeeStoreRelation(ep, store);
            rel.setHireDate(LocalDate.now().minusMonths(s.hiresMonthsAgo()));
            rel.setContractedWeeklyDays(s.weeklyDays());
            employeeStoreRelationRepository.save(rel);
        }
        log.info("DevSeed: 더미 직원 9명 추가 완료 (emp1~9@sodam.dev, 비번=SODAM_DEV_SEED_PASSWORD)");
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
