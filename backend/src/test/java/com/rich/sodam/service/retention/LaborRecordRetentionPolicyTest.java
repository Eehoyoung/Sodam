package com.rich.sodam.service.retention;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.RetentionPurgeScheduleRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-J — 근로관계 기록(출퇴근·근로계약) 3년 보존정책 검증.
 *
 * <p>핵심은 <b>기산점이 개별 기록 발생일이 아니라 근로관계 종료일</b>이라는 것이다. 발생일 기준이면
 * 장기 재직자의 초기 기록이 퇴직 전에 먼저 파기돼 근로기준법 §42가 요구하는 최소 보존을 오히려
 * 위반한다 — {@link #activeEmployeeRecordsAreNeverScheduled()}가 그 회귀를 막는다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LaborRecordRetentionPolicyTest {

    private static final AtomicInteger SEQ = new AtomicInteger(0);

    @Autowired private RetentionPurgeService retentionPurgeService;
    @Autowired private RetentionPurgeScheduleRepository scheduleRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private LaborContractRepository laborContractRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private UserRepository userRepository;

    /** 한 직원-매장 쌍의 출퇴근 1건 + 근로계약 1건. */
    private record Fixture(Long attendanceId, Long contractId) {
    }

    private Fixture createRecords(boolean active, LocalDateTime deactivatedAt) throws Exception {
        return createRecords(active, deactivatedAt, false);
    }

    /**
     * @param active        현재 재직 중인지
     * @param deactivatedAt 비활성 관계의 퇴사 시각(active=true 면 무시)
     * @param rehired       퇴사 이력 위에 활성 관계가 하나 더 있는 재입사 상황인지
     */
    private Fixture createRecords(boolean active, LocalDateTime deactivatedAt, boolean rehired) throws Exception {
        int n = SEQ.incrementAndGet();

        User employeeUser = new User("retention_labor" + n + "@example.com", "보존직원" + n);
        employeeUser.setUserGrade(UserGrade.EMPLOYEE);
        employeeUser = userRepository.saveAndFlush(employeeUser);

        EmployeeProfile profile = employeeProfileRepository.save(new EmployeeProfile(employeeUser));
        Store store = storeRepository.save(
                new Store("보존매장" + n, String.format("%010d", 8_000_000_000L + n), "02-000-0000", "카페", 12_000, 100));

        EmployeeStoreRelation relation = relationRepository.save(new EmployeeStoreRelation(profile, store, 12_000));
        if (!active) {
            relation.changeActive(false);
            setField(relation, "deactivatedAt", deactivatedAt);
            relationRepository.saveAndFlush(relation);

            if (rehired) {
                // 같은 직원이 같은 매장에 다시 입사 — 활성 관계가 새로 생긴다.
                relationRepository.saveAndFlush(new EmployeeStoreRelation(profile, store, 12_000));
            }
        }

        Attendance attendance = new Attendance(profile, store);
        attendance.checkIn(37.0, 127.0, 12_000);
        attendanceRepository.saveAndFlush(attendance);

        LaborContract contract = new LaborContract();
        contract.setEmployeeId(profile.getId());
        contract.setStoreId(store.getId());
        contract.setStartDate(LocalDate.now().minusYears(6));
        contract.setHourlyWage(12_000);
        laborContractRepository.saveAndFlush(contract);

        return new Fixture(attendance.getId(), contract.getId());
    }

    private void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }

    private boolean scheduled(String tableName, Long entityId) {
        return scheduleRepository.findByTableNameAndEntityId(tableName, entityId).isPresent();
    }

    @Test
    @DisplayName("퇴사 후 3년이 지나면 출퇴근·근로계약이 파기 대상으로 등록된다")
    void recordsExpireThreeYearsAfterEmploymentEnded() throws Exception {
        Fixture f = createRecords(false, LocalDateTime.now().minusYears(4));

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduled("attendance", f.attendanceId())).isTrue();
        assertThat(scheduled("labor_contract", f.contractId())).isTrue();
    }

    @Test
    @DisplayName("퇴사했어도 3년이 안 지났으면 아직 파기 대상이 아니다")
    void recordsWithinRetentionPeriodAreNotScheduled() throws Exception {
        Fixture f = createRecords(false, LocalDateTime.now().minusYears(2));

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduled("attendance", f.attendanceId())).isFalse();
        assertThat(scheduled("labor_contract", f.contractId())).isFalse();
    }

    @Test
    @DisplayName("재직 중이면 기록이 아무리 오래돼도 파기 대상이 되지 않는다 — 발생일 기산 회귀 방지")
    void activeEmployeeRecordsAreNeverScheduled() throws Exception {
        // 계약 시작일이 6년 전이라 '발생일 기산'이었다면 이미 만료됐을 기록이다.
        Fixture f = createRecords(true, null);

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduled("attendance", f.attendanceId())).isFalse();
        assertThat(scheduled("labor_contract", f.contractId())).isFalse();
    }

    @Test
    @DisplayName("재입사해 활성 관계가 다시 생기면 과거 퇴사 이력이 있어도 파기 대상에서 빠진다")
    void rehiredEmployeeRecordsAreExcluded() throws Exception {
        Fixture f = createRecords(false, LocalDateTime.now().minusYears(4), true);

        retentionPurgeService.scanAndSchedule();

        assertThat(scheduled("attendance", f.attendanceId())).isFalse();
        assertThat(scheduled("labor_contract", f.contractId())).isFalse();
    }

    @Test
    @DisplayName("근로관계 기록은 사전 고지 대상으로 표시된다 — 고지 없이 파기되면 안 된다")
    void laborRecordPoliciesRequireNotice() {
        assertThat(policyFor("attendance").noticeRequired()).isTrue();
        assertThat(policyFor("labor_contract").noticeRequired()).isTrue();
    }

    @Autowired private java.util.List<RetentionPolicy> policies;

    private RetentionPolicy policyFor(String tableName) {
        return policies.stream()
                .filter(p -> p.tableName().equals(tableName))
                .findFirst()
                .orElseThrow(() -> new AssertionError(tableName + " 보존정책 빈이 등록되지 않았습니다"));
    }
}
