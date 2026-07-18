package com.rich.sodam.config;

import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.AttendanceIrregularityType;
import com.rich.sodam.domain.type.BonusPaymentTiming;
import com.rich.sodam.domain.type.EmploymentType;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * {@link LoadTestSeedRunner}의 매장 1개 단위 시드 실행기(Phase 8, 2026-07-10~11 세션 — 초대형 규모 확장).
 *
 * <p>{@code LoadTestSeedRunner.run()}이 자기 자신의 {@code @Transactional} 메서드를 직접 호출(자기호출)하면
 * Spring AOP 프록시를 우회해 트랜잭션이 전혀 걸리지 않는다(CLAUDE.md 아키텍처 핵심 문서화 항목,
 * {@link com.rich.sodam.service.PayrollBatchExecutor}와 동일 사유로 별도 빈으로 분리) — 실제로 이 분리
 * 없이 처음 구현했을 때 {@code PersistentObjectException: detached entity passed to persist}가 발생해
 * 원인을 확인하고 이 클래스로 추출했다.</p>
 *
 * <p><b>attendance·work_shift·payroll_bonus 모두 배치 INSERT인 이유</b>: 매장 1,000개×직원 2만명×24개월
 * 규모의 첫 실행에서 attendance만 배치로 바꾸고 work_shift는 JPA {@code save()} 건별 저장으로 남겨뒀다가
 * 실제로 크래시를 겪었다 — work_shift가 약 98만 건까지 쌓이자(전체의 75% 지점, 매장 757개째) 인덱스
 * 유지비용이 누적돼 매장 1개당 트랜잭션 시간이 Spring 기본 트랜잭션 타임아웃(30초)을 넘겼고, 이 예외가
 * 어디서도 잡히지 않아 {@code CommandLineRunner} 전체가 죽으면서 애플리케이션이 통째로 종료됐다. 그
 * 사건 이후 work_shift·payroll_bonus도 {@link JdbcTemplate#batchUpdate}로 전환했다 — 테이블이 아무리
 * 커져도 매장 1개당 INSERT 자체는 왕복 1회에 가깝게 유지되도록. {@code docker-compose.yml}의
 * {@code DB_URL}에 {@code rewriteBatchedStatements=true}를 추가해 MySQL Connector/J가 배치를 다건
 * VALUES로 재작성하도록 했다 — 이 옵션 없이는 JDBC 배치가 사실상 개별 INSERT와 다르지 않다.</p>
 *
 * <p>AttendanceIrregularity만 여전히 JPA 경로다 — 월급제 대상 직원(전체의 약 14%)의 시프트 중 약 8%에만
 * 생성돼 전체 볼륨이 work_shift의 1% 미만이라 배치 전환의 실익이 낮고, work_shift_id를 참조해야 하는데
 * 배치 INSERT로는 생성된 ID를 바로 받을 수 없어(JDBC 배치는 개별 row의 auto-increment 값을 안정적으로
 * 반환하지 않음) 저장 직후 조회(attendance_id 조회와 동일 패턴)로 우회하느니 JPA를 쓰는 편이 더 단순
 * 하다고 판단했다.</p>
 *
 * <p>{@code @Transactional(timeout = 120)}으로 안전 여유를 뒀다 — 배치 전환 후에도 예상 밖의 DB 지연이
 * 있을 수 있어, 기본 30초보다 넉넉하게 잡아 재발을 이중으로 막는다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoadTestStoreSeeder {

    private static final String INSERT_ATTENDANCE_SQL =
            "INSERT INTO attendance (employee_id, store_id, check_in_time, check_out_time, "
                    + "check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, "
                    + "applied_hourly_wage, holiday_work) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, 0)";

    private static final String INSERT_WORK_SHIFT_SQL =
            "INSERT INTO work_shift (employee_id, store_id, shift_date, start_time, end_time, memo, "
                    + "created_at, confirmed_at, confirmation_notification_sent_at) "
                    + "VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL)";

    private static final String INSERT_PAYROLL_BONUS_SQL =
            "INSERT INTO payroll_bonus (employee_id, store_id, bonus_date, amount, reason, payment_timing, "
                    + "included_in_payroll_id, created_by_master_id, created_at) "
                    + "VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)";

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final MasterProfileRepository masterProfileRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final PayrollPolicyRepository payrollPolicyRepository;
    private final AttendanceIrregularityRepository attendanceIrregularityRepository;
    private final SubscriptionService subscriptionService;
    private final JdbcTemplate jdbcTemplate;

    private record SeededEmployee(Long employeeId, int wage, boolean monthlySalaried) {
    }

    @Transactional(timeout = 120)
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

        // PRO 구독 부여 — 근로계약서 작성(E_CONTRACT)이 PRO 플랜 게이트라 시나리오 D(동시 작성)가
        // 이 구독 없이는 전부 402로 막힌다. mock Toss 클라이언트라 실결제 없음.
        try {
            subscriptionService.subscribe(owner.getId(), PlanType.PRO, "MOCK_AUTH_KEY_LOADTEST");
        } catch (Exception e) {
            log.warn("LoadTestSeed: 구독 부여 실패 storeIndex={} reason={}", storeIndex, e.getMessage());
        }

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
        LocalDate recentWindowStart = LocalDate.now().minusMonths(Math.min(3, historyMonths));

        // 1단계 — 직원 생성 + attendance/work_shift/payroll_bonus 배치 수집(아직 INSERT 안 함, 매장
        // 전체를 한 번에 묶어 넣기 위해 — 매장당 INSERT 왕복 횟수를 최소화한다).
        List<SeededEmployee> employees = new ArrayList<>(employeesPerStore);
        List<Object[]> attendanceBatch = new ArrayList<>();
        List<Object[]> shiftBatch = new ArrayList<>();
        List<Object[]> bonusBatch = new ArrayList<>();

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
            Long employeeId = profile.getId();

            EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store, wage);
            relation.setHireDate(historyStart.minusDays(7));
            relation.setContractedWeeklyDays(5);

            // 직원의 ~14%를 월급제(정규직)로 설정 — 급여정산 시나리오 다양화 + 근태이상감지(월급제 전용)
            // 대상 확보(사용자 요청: "급여정산" "근태이상" 레코드 함께 시드).
            boolean monthlySalaried = (e % 7 == 0);
            if (monthlySalaried) {
                relation.setEmploymentType(EmploymentType.MONTHLY_SALARY);
                relation.setMonthlySalary(2_200_000 + (e % 5) * 100_000);
                relation.setSocialInsuranceEnrolled(true);
            }
            employeeStoreRelationRepository.save(relation);

            collectAttendanceHistory(attendanceBatch, employeeId, store.getId(), wage, historyStart);
            collectShiftHistory(shiftBatch, employeeId, store.getId(), recentWindowStart);
            collectQuarterlyBonuses(bonusBatch, employeeId, store.getId(), owner.getId(), historyStart);
            employees.add(new SeededEmployee(employeeId, wage, monthlySalaried));
        }

        if (!attendanceBatch.isEmpty()) {
            jdbcTemplate.batchUpdate(INSERT_ATTENDANCE_SQL, attendanceBatch);
        }
        if (!shiftBatch.isEmpty()) {
            jdbcTemplate.batchUpdate(INSERT_WORK_SHIFT_SQL, shiftBatch);
        }
        if (!bonusBatch.isEmpty()) {
            jdbcTemplate.batchUpdate(INSERT_PAYROLL_BONUS_SQL, bonusBatch);
        }

        // 2단계 — AttendanceIrregularity(월급제 대상만, 시프트 배치 INSERT가 끝난 뒤라 work_shift_id를
        // 조회로 확보할 수 있다). 전체 볼륨이 작아(대상 직원의 8%) 개별 JPA save 유지.
        for (SeededEmployee se : employees) {
            if (se.monthlySalaried()) {
                seedIrregularities(se.employeeId(), store.getId(), recentWindowStart);
            }
        }
    }

    /**
     * 평일(월~금)만, 09:00±변동 출근 / 18:00±변동 퇴근 — 배치 INSERT용 행 데이터만 수집한다(즉시
     * 저장하지 않음). 오늘 날짜는 의도적으로 제외한다 — 시나리오 A(동시 체크인)가 "아직 출근 기록이
     * 없는 오늘"을 대상으로 실제 체크인 API를 호출해야 하기 때문(초판에서 실측 발견).
     */
    private void collectAttendanceHistory(List<Object[]> batch, Long employeeId, Long storeId, int wage,
                                           LocalDate historyStart) {
        LocalDate cursor = historyStart;
        LocalDate today = LocalDate.now();
        int dayOffset = (employeeId != null ? employeeId.intValue() : 0) % 20; // 직원마다 약간의 지터

        while (cursor.isBefore(today)) {
            if (cursor.getDayOfWeek().getValue() <= 5) { // 월(1)~금(5)
                LocalDateTime checkIn = cursor.atTime(9, dayOffset % 15);
                LocalDateTime checkOut = cursor.atTime(18, dayOffset % 15);
                batch.add(new Object[]{employeeId, storeId, Timestamp.valueOf(checkIn), Timestamp.valueOf(checkOut), wage});
            }
            cursor = cursor.plusDays(1);
        }
    }

    /** 최근 3개월(또는 전체 이력이 그보다 짧으면 전체) — 실제 시프트 등록은 근시일 스케줄링이 현실적이라 전체 이력만큼 채우지 않는다. */
    private void collectShiftHistory(List<Object[]> batch, Long employeeId, Long storeId, LocalDate windowStart) {
        LocalDate cursor = windowStart;
        LocalDate today = LocalDate.now();
        int dayOffset = (employeeId != null ? employeeId.intValue() : 0) % 20;
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());

        while (cursor.isBefore(today)) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                batch.add(new Object[]{
                        employeeId, storeId, java.sql.Date.valueOf(cursor),
                        java.sql.Time.valueOf(LocalTime.of(9, dayOffset % 15)),
                        java.sql.Time.valueOf(LocalTime.of(18, dayOffset % 15)),
                        now,
                });
            }
            cursor = cursor.plusDays(1);
        }
    }

    /** 분기(3개월)당 1건 — "오늘 바빠서 더 드릴게요" 즉흥 보너스를 흉내낸다. */
    private void collectQuarterlyBonuses(List<Object[]> batch, Long employeeId, Long storeId, Long masterId,
                                          LocalDate historyStart) {
        LocalDate cursor = historyStart.plusDays(30);
        LocalDate today = LocalDate.now();
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        while (cursor.isBefore(today)) {
            batch.add(new Object[]{
                    employeeId, storeId, java.sql.Date.valueOf(cursor), 50_000,
                    "부하테스트 분기 포상금", BonusPaymentTiming.INCLUDED_IN_PAYROLL.name(), masterId, now,
            });
            cursor = cursor.plusMonths(3);
        }
    }

    /**
     * 월급제 직원의 최근 3개월 시프트 중 약 8%에 지각/조퇴/결근을 기록한다(모두 PENDING — 사장 확정
     * 전 상태). work_shift가 이미 배치 INSERT됐으므로 (employee_id, store_id, shift_date)로 역조회해
     * work_shift_id를 얻는다.
     */
    private void seedIrregularities(Long employeeId, Long storeId, LocalDate windowStart) {
        LocalDate cursor = windowStart;
        LocalDate today = LocalDate.now();
        int i = 0;
        while (cursor.isBefore(today)) {
            if (cursor.getDayOfWeek().getValue() <= 5) {
                i++;
                if (i % 12 == 0) { // 약 8%
                    seedOneIrregularity(employeeId, storeId, cursor, i % 3);
                }
            }
            cursor = cursor.plusDays(1);
        }
    }

    private void seedOneIrregularity(Long employeeId, Long storeId, LocalDate shiftDate, int typeSelector) {
        List<Long> shiftIds = jdbcTemplate.queryForList(
                "SELECT work_shift_id FROM work_shift WHERE employee_id=? AND store_id=? AND shift_date=? LIMIT 1",
                Long.class, employeeId, storeId, shiftDate);
        if (shiftIds.isEmpty()) {
            return;
        }
        Long workShiftId = shiftIds.get(0);

        AttendanceIrregularityType type = switch (typeSelector) {
            case 0 -> AttendanceIrregularityType.LATE;
            case 1 -> AttendanceIrregularityType.EARLY_LEAVE;
            default -> AttendanceIrregularityType.ABSENCE;
        };
        Long attendanceId = null;
        if (type != AttendanceIrregularityType.ABSENCE) {
            List<Long> found = jdbcTemplate.queryForList(
                    "SELECT attendance_id FROM attendance WHERE employee_id=? AND store_id=? "
                            + "AND DATE(check_in_time)=? LIMIT 1",
                    Long.class, employeeId, storeId, shiftDate);
            attendanceId = found.isEmpty() ? null : found.get(0);
        }
        AttendanceIrregularity ai = AttendanceIrregularity.detect(
                employeeId, storeId, workShiftId, attendanceId, shiftDate, type, 15);
        attendanceIrregularityRepository.save(ai);
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
