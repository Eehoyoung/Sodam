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

    /**
     * C-3 — 화면에서 넣은 가감조정이 실제로 서버 급여에 반영돼야 한다.
     * 반영되지 않으면 사장이 본 총액과 확정 급여가 갈려 임금체불/과다지급 분쟁이 된다.
     */
    @Test
    void issueAppliesAdjustmentToNetWageBeforeConfirming() {
        PayrollRepository payrolls = mock(PayrollRepository.class);
        PayrollService payrollService = mock(PayrollService.class);
        DelegatedActionAuthorityService authorities = mock(DelegatedActionAuthorityService.class);
        StepUpAuthenticationService stepUp = mock(StepUpAuthenticationService.class);
        StoreDelegationAuditRepository audits = mock(StoreDelegationAuditRepository.class);
        StoreAccessGuard guard = mock(StoreAccessGuard.class);
        PayrollHighRiskActionService service = new PayrollHighRiskActionService(
                payrolls, payrollService, authorities, stepUp, audits, guard);

        Payroll payroll = payroll(10L, 20L);
        payroll.setGrossWage(1_000_000);
        payroll.setTaxAmount(33_000);
        payroll.calculateNetWage(); // 967,000

        when(payrolls.findByIdForUpdate(30L)).thenReturn(Optional.of(payroll));
        when(authorities.require(1L, 10L, ManagerPermission.PAYROLL_CONFIRM))
                .thenReturn(new DelegatedActionAuthorityService.Authority(
                        1L, 99L, false, 700L, 3,
                        EnumSet.of(ManagerPermission.PAYROLL_CONFIRM)));
        when(payrollService.issuePayroll(30L)).thenReturn(payroll);

        service.issue(1L, 30L, "raw-password", -50_000, "지각 공제",
                com.rich.sodam.domain.StoreDelegationAudit.AccessChannel.MOBILE);

        // 세후 가산(2026-08-18 확정) — grossWage/taxAmount 는 그대로여야 한다.
        assertThat(payroll.getAdjustment()).isEqualTo(-50_000);
        assertThat(payroll.getAdjustmentReason()).isEqualTo("지각 공제");
        assertThat(payroll.getGrossWage()).isEqualTo(1_000_000);
        assertThat(payroll.getTaxAmount()).isEqualTo(33_000);
        assertThat(payroll.getNetWage()).isEqualTo(917_000);
    }

    /** 급여보다 큰 차감은 근로기준법 §43 전액지급 원칙 문제라 막는다. */
    @Test
    void adjustmentCannotDriveNetWageNegative() {
        Payroll payroll = payroll(10L, 20L);
        payroll.setGrossWage(100_000);
        payroll.setTaxAmount(3_300);

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> payroll.applyAdjustment(-1_000_000, "과다 차감"))
                .isInstanceOf(IllegalArgumentException.class);
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
