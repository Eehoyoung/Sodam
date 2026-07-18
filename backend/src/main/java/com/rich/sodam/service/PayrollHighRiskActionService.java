package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.StoreDelegationAudit;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.domain.type.PayrollStatus;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.StoreDelegationAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 급여 확정·발급을 위임 재검증, step-up, actor audit와 한 트랜잭션으로 묶는다. */
@Service
@RequiredArgsConstructor
public class PayrollHighRiskActionService {
    private final PayrollRepository payrollRepository;
    private final PayrollService payrollService;
    private final DelegatedActionAuthorityService authorityService;
    private final StepUpAuthenticationService stepUpAuthenticationService;
    private final StoreDelegationAuditRepository auditRepository;
    private final StoreAccessGuard guard;

    @Transactional
    public Payroll changeStatus(Long actorUserId, Long payrollId, PayrollStatus status,
                                java.time.LocalDate paymentDate, String cancelReason, String stepUpPassword) {
        Payroll payroll = lock(payrollId);
        Long storeId = payroll.getStore().getId();
        if (status != PayrollStatus.CONFIRMED && status != PayrollStatus.PAID) {
            guard.assertMasterOwnsStore(actorUserId, storeId);
            return payrollService.updatePayrollStatus(payrollId, status, paymentDate, cancelReason);
        }
        DelegatedActionAuthorityService.Authority authority =
                authorityService.require(actorUserId, storeId, ManagerPermission.PAYROLL_CONFIRM);
        stepUpAuthenticationService.verifyPassword(actorUserId, stepUpPassword);
        Payroll saved = payrollService.updatePayrollStatus(payrollId, status, paymentDate, cancelReason);
        record(saved, authority, status.name());
        return saved;
    }

    @Transactional
    public Payroll issue(Long actorUserId, Long payrollId, String stepUpPassword) {
        Payroll payroll = lock(payrollId);
        Long storeId = payroll.getStore().getId();
        DelegatedActionAuthorityService.Authority authority =
                authorityService.require(actorUserId, storeId, ManagerPermission.PAYROLL_CONFIRM);
        stepUpAuthenticationService.verifyPassword(actorUserId, stepUpPassword);
        Payroll saved = payrollService.issuePayroll(payrollId);
        record(saved, authority, "ISSUED");
        return saved;
    }

    private Payroll lock(Long payrollId) {
        return payrollRepository.findByIdForUpdate(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));
    }

    private void record(Payroll payroll, DelegatedActionAuthorityService.Authority authority, String result) {
        auditRepository.save(StoreDelegationAudit.of(
                payroll.getStore().getId(), payroll.getEmployee().getId(), authority.ownerUserId(),
                authority.actorUserId(), authority.owner() ? StoreDelegationAudit.ActorType.MASTER
                        : StoreDelegationAudit.ActorType.MANAGER,
                StoreDelegationAudit.Action.PAYROLL_CONFIRMED, authority.permissions(),
                authority.delegationVersion(), authority.delegationEnvelopeId(), null,
                "password-step-up:" + result));
    }
}
