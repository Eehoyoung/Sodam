package com.rich.sodam.controller;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.dto.request.PayrollStatusUpdateDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.PayrollService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.PayrollHighRiskActionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * GET /api/payroll/{payrollId} 단건 조회 회귀 테스트.
 *
 * <p>배경(FE_BE_SCHEMA_GAP §1-1): SalaryDetailScreen 은 실수령액/기간 등 요약 정보를 표시해야 하는데
 * 기존 GET /api/payroll/{payrollId}/details 는 근무일별 배열(PayrollDetailDto[])만 반환해 요약 필드가
 * 없다. 이 신규 엔드포인트는 이미 존재하는 {@link PayrollService#getPayrollById(Long)} 를 그대로 노출해
 * 요약 헤더(실수령액·기간·상태)를 공급한다 — 급여 계산 로직은 변경하지 않음.
 *
 * <p>IDOR 회귀: 임의 payrollId 로 타인 급여를 열람하면 안 되므로 guard.assertCanViewEmployee 가
 * 서비스 응답 반환 전에 반드시 호출되어야 한다.
 */
@ExtendWith(MockitoExtension.class)
class PayrollControllerTest {

    @Mock
    PayrollService payrollService;
    @Mock
    StoreAuthorizationPolicy guard;
    @Mock
    PayrollHighRiskActionService payrollHighRiskActionService;
    @InjectMocks
    PayrollController controller;

    private final UserPrincipal principal = new UserPrincipal(1L, "emp@sodam.dev", List.of());

    private Payroll buildPayroll(Long employeeId, Long storeId) {
        User user = new User();
        user.setId(employeeId);
        user.setName("홍길동");

        EmployeeProfile employee = new EmployeeProfile();
        employee.setId(employeeId);
        employee.setUser(user);

        // lenient: 거부(IDOR) 테스트에서는 guard 가 먼저 던져서 PayrollDto.from 까지 도달하지 않아 미사용 스터빙이 된다
        Store store = mock(Store.class);
        lenient().when(store.getId()).thenReturn(storeId);
        lenient().when(store.getStoreName()).thenReturn("카페 소담");

        Payroll payroll = new Payroll();
        payroll.setId(100L);
        payroll.setEmployee(employee);
        payroll.setStore(store);
        payroll.setRegularHours(160.0);
        payroll.setOvertimeHours(0.0);
        payroll.setNightWorkHours(0.0);
        payroll.setNetWage(2_000_000);
        payroll.setStatus(PayrollStatus.CONFIRMED);
        return payroll;
    }

    @Test
    @DisplayName("본인 급여 단건 조회 — guard 통과 후 PayrollDto(실수령액 포함) 반환")
    void getPayroll_success() {
        Payroll payroll = buildPayroll(1L, 20L);
        when(payrollService.getPayrollById(100L)).thenReturn(payroll);

        ResponseEntity<PayrollDto> res = controller.getPayroll(principal, 100L);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().getId()).isEqualTo(100L);
        assertThat(res.getBody().getNetWage()).isEqualTo(2_000_000);
        assertThat(res.getBody().getStatus()).isEqualTo(PayrollStatus.CONFIRMED);
        assertThat(res.getBody().getEmployeeName()).isEqualTo("홍길동");
        verify(guard).assertSelf(1L, 1L);
    }

    @Test
    @DisplayName("타인 급여 payrollId 로 접근 시도 → guard 가 AccessDeniedException 을 던지고 응답은 만들어지지 않는다")
    void getPayroll_deniedForOtherEmployee() {
        Payroll payroll = buildPayroll(999L, 20L);
        when(payrollService.getPayrollById(100L)).thenReturn(payroll);
        doThrow(new AccessDeniedException("본인 정보만 접근할 수 있어요."))
                .when(guard).assertSelf(1L, 999L);

        assertThatThrownBy(() -> controller.getPayroll(principal, 100L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("사업주 급여 단건 조회 — 실제 급여 매장의 소유권으로 검증")
    void getPayroll_masterChecksActualPayrollStore() {
        UserPrincipal master = new UserPrincipal(1L, "master@sodam.dev", List.of(
                new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_MASTER")));
        Payroll payroll = buildPayroll(2L, 99L);
        when(payrollService.getPayrollById(100L)).thenReturn(payroll);
        doThrow(new AccessDeniedException("해당 매장에 접근할 권한이 없습니다."))
                .when(guard).assertMasterOwnsStore(1L, 99L);

        assertThatThrownBy(() -> controller.getPayroll(master, 100L))
                .isInstanceOf(AccessDeniedException.class);

        verify(guard).assertMasterOwnsStore(1L, 99L);
    }

    @Test
    @DisplayName("존재하지 않는 payrollId → 서비스 계층 예외가 그대로 전파되고 guard 는 호출되지 않는다")
    void getPayroll_notFound_neverCallsGuard() {
        when(payrollService.getPayrollById(404L))
                .thenThrow(new com.rich.sodam.exception.EntityNotFoundException("급여 내역을 찾을 수 없습니다."));

        assertThatThrownBy(() -> controller.getPayroll(principal, 404L))
                .isInstanceOf(com.rich.sodam.exception.EntityNotFoundException.class);

        verifyNoInteractions(guard);
    }

    @Test
    @DisplayName("급여 상태 변경 — 급여의 매장 소유권 확인 후 변경")
    void updatePayrollStatus_checksStoreOwnership() {
        Payroll target = buildPayroll(2L, 20L);
        when(payrollHighRiskActionService.changeStatus(
                1L, 100L, PayrollStatus.PAID, null, null, "step-up"))
                .thenReturn(target);

        ResponseEntity<PayrollDto> response = controller.updatePayrollStatus(
                principal,
                100L,
                null,
                PayrollStatusUpdateDto.builder().status(PayrollStatus.PAID).stepUpPassword("step-up").build());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(payrollHighRiskActionService).changeStatus(
                1L, 100L, PayrollStatus.PAID, null, null, "step-up");
    }

    @Test
    @DisplayName("타 매장 급여 상태 변경 — 소유권 거부 후 변경 서비스 미호출")
    void updatePayrollStatus_deniedForOtherStore() {
        doThrow(new AccessDeniedException("해당 매장에 접근할 권한이 없습니다."))
                .when(payrollHighRiskActionService).changeStatus(
                        1L, 100L, PayrollStatus.PAID, null, null, "step-up");

        assertThatThrownBy(() -> controller.updatePayrollStatus(
                principal,
                100L,
                null,
                PayrollStatusUpdateDto.builder().status(PayrollStatus.PAID).stepUpPassword("step-up").build()))
                .isInstanceOf(AccessDeniedException.class);

        verify(payrollService, never()).updatePayrollStatus(100L, PayrollStatus.PAID);
    }
}
