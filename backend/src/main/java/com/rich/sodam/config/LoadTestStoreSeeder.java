package com.rich.sodam.config;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * {@link LoadTestSeedRunner}의 매장 1개 단위 시드 실행기(Phase 8).
 *
 * <p>{@code LoadTestSeedRunner.run()}이 자기 자신의 {@code @Transactional} 메서드를 직접 호출(자기호출)하면
 * Spring AOP 프록시를 우회해 트랜잭션이 전혀 걸리지 않는다(CLAUDE.md 아키텍처 핵심 문서화 항목,
 * {@link com.rich.sodam.service.PayrollBatchExecutor}와 동일 사유로 별도 빈으로 분리) — 실제로 이 분리
 * 없이 처음 구현했을 때 {@code PersistentObjectException: detached entity passed to persist}가 발생해
 * 원인을 확인하고 이 클래스로 추출했다.</p>
 */
@Component
@RequiredArgsConstructor
public class LoadTestStoreSeeder {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final MasterProfileRepository masterProfileRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollPolicyRepository payrollPolicyRepository;
    private final AttendanceRepository attendanceRepository;

    @Transactional
    public void seedOneStore(int storeIndex, int employeesPerStore, int historyMonths, String passwordHash) {
        User owner = buildUser("loadtest-owner-" + storeIndex + "@sodam.load", "부하테스트사장" + storeIndex,
                UserGrade.MASTER, passwordHash);
        owner = userRepository.saveAndFlush(owner);
        owner = userRepository.findById(owner.getId()).orElseThrow();

        MasterProfile masterProfile = new MasterProfile(owner);
        masterProfileRepository.save(masterProfile);

        // 사업자등록번호 10자리 — 매장마다 유니크해야 하므로 인덱스 기반 생성.
        String businessNumber = String.format("900%07d", storeIndex);
        Store store = new Store(
                "부하테스트매장" + storeIndex,
                businessNumber,
                "02-000-" + String.format("%04d", storeIndex),
                "카페",
                12_000,
                100);
        // 좌표는 서울 시내 범위에서 매장마다 약간씩 분산(체크인 반경 로직이 실제로 계산되도록).
        double lat = 37.50 + (storeIndex % 50) * 0.001;
        double lon = 126.97 + (storeIndex % 50) * 0.001;
        store.updateLocation(lat, lon, "서울특별시 부하테스트로 " + storeIndex, store.getRadius());
        store = storeRepository.save(store);

        masterStoreRelationRepository.save(new MasterStoreRelation(masterProfile, store));

        PayrollPolicy policy = new PayrollPolicy();
        policy.setStore(store);
        policy.setTaxPolicyType(TaxPolicyType.INCOME_TAX_3_3);
        policy.setNightWorkRate(1.5);
        policy.setOvertimeRate(1.5);
        policy.setRegularHoursPerDay(8.0);
        policy.setWeeklyAllowanceEnabled(true);
        policy.setNightWorkStartTime(LocalTime.of(22, 0));
        payrollPolicyRepository.save(policy);

        LocalDate historyStart = LocalDate.now().minusMonths(historyMonths);

        for (int e = 0; e < employeesPerStore; e++) {
            int wage = 9_860 + (e % 6) * 500; // 최저임금 부근에서 소폭 분산
            User empUser = buildUser(
                    "loadtest-emp-" + storeIndex + "-" + e + "@sodam.load",
                    "부하테스트직원" + storeIndex + "-" + e,
                    UserGrade.EMPLOYEE, passwordHash);
            empUser = userRepository.saveAndFlush(empUser);
            empUser = userRepository.findById(empUser.getId()).orElseThrow();

            EmployeeProfile profile = new EmployeeProfile(empUser);
            employeeProfileRepository.save(profile);

            EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store, wage);
            relation.setHireDate(historyStart.minusDays(7));
            relation.setContractedWeeklyDays(5);
            employeeStoreRelationRepository.save(relation);

            seedAttendanceHistory(profile, store, wage, historyStart);
        }
    }

    /**
     * 평일(월~금)만, 09:00±변동 출근 / 18:00±변동 퇴근 — manualCheckIn/Out으로 과거 날짜에 직접 기록.
     *
     * <p>오늘 날짜는 의도적으로 제외한다 — 부하테스트 시나리오 A(동시 체크인)가 "아직 출근 기록이 없는
     * 오늘"을 대상으로 실제 체크인 API를 호출해야 하는데, 이력에 오늘 것까지 채워버리면 모든 체크인
     * 시도가 "이미 출근 처리됨"으로 거부돼 시나리오 A 자체가 성립하지 않는다(초판에서 실측 발견).</p>
     */
    private void seedAttendanceHistory(EmployeeProfile profile, Store store, int wage, LocalDate historyStart) {
        LocalDate cursor = historyStart;
        LocalDate today = LocalDate.now();
        int dayOffset = (profile.getId() != null ? profile.getId().intValue() : 0) % 20; // 직원마다 약간의 지터

        while (cursor.isBefore(today)) {
            if (cursor.getDayOfWeek().getValue() <= 5) { // 월(1)~금(5)
                Attendance attendance = new Attendance(profile, store);
                LocalDateTime checkIn = cursor.atTime(9, (dayOffset % 15));
                LocalDateTime checkOut = cursor.atTime(18, (dayOffset % 15));
                attendance.manualCheckIn(checkIn, null, null, wage);
                attendance.manualCheckOut(checkOut, null, null);
                attendanceRepository.save(attendance);
            }
            cursor = cursor.plusDays(1);
        }
    }

    private User buildUser(String email, String name, UserGrade grade, String passwordHash) {
        User u = new User();
        u.setEmail(email);
        u.setName(name);
        u.setUserGrade(grade);
        u.setPassword(passwordHash);
        LocalDateTime now = LocalDateTime.now();
        u.setCreatedAt(now);
        u.setAgeConfirmedAt(now);
        u.setTermsAgreedAt(now);
        u.setPrivacyAgreedAt(now);
        u.setMarketingAgreedAt(now);
        u.setLocationInfoAgreedAt(now); // GPS 출퇴근 체크인 필수 동의(위치정보법 §18·§19) — 시나리오 A용
        u.setProfileCompletedAt(now);
        return u;
    }
}
