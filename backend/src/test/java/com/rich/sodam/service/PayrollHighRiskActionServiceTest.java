package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PayrollHighRiskActionServiceTest {
    @Test
    void managerIssueRevalidatesAuthorityAndStepUpAndWritesAudit() {
        PayrollRepository payrolls = mock(PayrollRepository.class);
        PayrollService payrollService = mock(PayrollService.class);
        DelegatedActionAuthorityService authorities = mock(DelegatedActionAuthorityService.class);
        StepUpAuthenticationService stepUp = mock(StepUpAuthenticationService.class);
        StoreDelegationAuditRepository audits = mock(StoreDelegationAuditRepository.class);
        StoreAccessGuard guard = mock(StoreAccessGuard.class);
        PayrollHighRiskActionService service = new PayrollHighRiskActionService(
                payrolls, payrollService, authorities, stepUp, audits, guard);
        Payroll payroll = payroll(10L, 20L);
        when(payrolls.findByIdForUpdate(30L)).thenReturn(Optional.of(payroll));
        when(authorities.require(1L, 10L, ManagerPermission.PAYROLL_CONFIRM))
                .thenReturn(new DelegatedActionAuthorityService.Authority(
                        1L, 99L, false, 700L, 3,
                        EnumSet.of(ManagerPermission.PAYROLL_CONFIRM)));
        when(payrollService.issuePayroll(30L)).thenReturn(payroll);

        Payroll result = service.issue(1L, 30L, "raw-password");

        assertThat(result).isSameAs(payroll);
        verify(stepUp).verifyPassword(1L, "raw-password");
        verify(audits).save(argThat(a -> a.getDelegationVersion() == 3
                && a.getSignatureEnvelopeId().equals(700L)
                && a.getActorUserId().equals(1L)));
    }

    private Payroll payroll(Long storeId, Long employeeId) {
        Store store = mock(Store.class);
        when(store.getId()).thenReturn(storeId);
        EmployeeProfile employee = new EmployeeProfile();
        employee.setId(employeeId);
        Payroll payroll = new Payroll();
        payroll.setStore(store);
        payroll.setEmployee(employee);
        payroll.setStatus(PayrollStatus.DRAFT);
        return payroll;
    }
}
