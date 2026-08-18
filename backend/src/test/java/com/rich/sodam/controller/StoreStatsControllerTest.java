package com.rich.sodam.controller;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.AttendanceCorrectionRequestRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.StoreStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 대시보드 합성 엔드포인트(DB_OPTIMIZATION_PLAN.md §Phase 9) 필드 동등성 검증.
 *
 * <p>{@code dashboard()} 응답의 {@code today}/{@code payroll} 중첩 필드가, 같은 매장에 대해 기존
 * {@code today()}/{@code monthToDate()} 엔드포인트를 각각 호출했을 때의 응답과 완전히 동일해야 한다 —
 * 새 엔드포인트가 조회 로직을 재사용만 할 뿐 별도 계산을 하지 않는다는 것을 보장한다.
 *
 * <p>WP-09 2단계(repository → StoreStatsService 이관) 이후에는 통계 조립 로직이 서비스에 있으므로,
 * 컨트롤러에는 실제 {@link StoreStatsService}(레포지토리는 mock)를 수동 주입해 원래 검증 의도(합성
 * 응답이 개별 응답과 필드까지 동일함)를 그대로 유지한다.</p>
 */
@ExtendWith(MockitoExtension.class)
class StoreStatsControllerTest {

    @Mock
    StoreRepository storeRepository;
    @Mock
    EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Mock
    AttendanceRepository attendanceRepository;
    @Mock
    PayrollRepository payrollRepository;
    @Mock
    AttendanceCorrectionRequestRepository attendanceCorrectionRequestRepository;
    @Mock
    StoreAuthorizationPolicy guard;

    StoreStatsController controller;

    private final UserPrincipal principal = new UserPrincipal(1L, "boss@sodam.dev", List.of());

    @BeforeEach
    void setUp() {
        StoreStatsService storeStatsService = new StoreStatsService(
                storeRepository, employeeStoreRelationRepository, attendanceRepository, payrollRepository,
                attendanceCorrectionRequestRepository);
        controller = new StoreStatsController(storeStatsService, guard);
    }

    @Test
    @DisplayName("dashboard() 응답의 today/payroll이 개별 엔드포인트 응답과 필드까지 동일하다")
    void dashboardMatchesIndividualEndpoints() {
        Store store = new Store("검증매장", "1234567890", "010-0000-0000", "카페", 12_000, 100);
        ReflectionTestUtils.setField(store, "id", 7L);

        when(storeRepository.findById(7L)).thenReturn(java.util.Optional.of(store));
        when(employeeStoreRelationRepository.findByStoreAndIsActiveTrue(store)).thenReturn(Collections.emptyList());
        when(attendanceRepository.findByStoreAndDate(any(), any(), any())).thenReturn(Collections.emptyList());
        when(payrollRepository.findByStore_IdOrderByEndDateDesc(7L)).thenReturn(Collections.emptyList());

        ResponseEntity<Map<String, Object>> todayResponse = controller.today(principal, 7L);
        ResponseEntity<Map<String, Object>> monthToDateResponse = controller.monthToDate(principal, 7L);
        ResponseEntity<Map<String, Object>> dashboardResponse = controller.dashboard(principal, 7L);

        Map<String, Object> body = dashboardResponse.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("today")).isEqualTo(todayResponse.getBody());
        assertThat(body.get("payroll")).isEqualTo(monthToDateResponse.getBody());

        // WP-00 계약 기준선: 세 엔드포인트 모두 200이고, dashboard() 응답은 today/payroll 두 키만 노출한다
        // (Store 엔티티나 그 밖의 필드가 새어나가지 않는다) — 상태코드·최상위 필드 shape를 함께 고정.
        assertThat(todayResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(monthToDateResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(dashboardResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(body).containsOnlyKeys("today", "payroll");
    }

    @Test
    @DisplayName("today() 의 pendingEmployees 는 이름과 함께 실제 employeeId(User id)를 내려준다")
    void pendingEmployeesCarryEmployeeId() {
        Store store = new Store("검증매장", "1234567890", "010-0000-0000", "카페", 12_000, 100);
        ReflectionTestUtils.setField(store, "id", 7L);

        User user = new User("staff@sodam.dev", "박직원");
        ReflectionTestUtils.setField(user, "id", 502L);
        EmployeeProfile profile = new EmployeeProfile(user);
        ReflectionTestUtils.setField(profile, "id", 502L);
        EmployeeStoreRelation relation = new EmployeeStoreRelation(profile, store);

        when(storeRepository.findById(7L)).thenReturn(java.util.Optional.of(store));
        when(employeeStoreRelationRepository.findByStoreAndIsActiveTrue(store)).thenReturn(List.of(relation));
        when(attendanceRepository.findByStoreAndDate(any(), any(), any())).thenReturn(Collections.emptyList());

        Map<String, Object> body = controller.today(principal, 7L).getBody();

        assertThat(body).isNotNull();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> pending = (List<Map<String, Object>>) body.get("pendingEmployees");
        // 이름만 내려주면 FE 가 알림 수신자를 특정할 수 없어 엉뚱한 직원에게 발송된다(C-2).
        assertThat(pending).hasSize(1);
        assertThat(pending.get(0)).containsEntry("employeeId", 502L).containsEntry("name", "박직원");
    }
}
