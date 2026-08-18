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
        return changeStatus(actorUserId, payrollId, status, paymentDate, cancelReason, stepUpPassword,
                StoreDelegationAudit.AccessChannel.MOBILE);
    }

    @Transactional
    public Payroll changeStatus(Long actorUserId, Long payrollId, PayrollStatus status,
                                java.time.LocalDate paymentDate, String cancelReason, String stepUpPassword,
                                StoreDelegationAudit.AccessChannel channel) {
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
        record(saved, authority, status.name(), channel);
        return saved;
    }

    @Transactional
    public Payroll issue(Long actorUserId, Long payrollId, String stepUpPassword) {
        return issue(actorUserId, payrollId, stepUpPassword, null, null,
                StoreDelegationAudit.AccessChannel.MOBILE);
    }

    public Payroll issue(Long actorUserId, Long payrollId, String stepUpPassword,
                         StoreDelegationAudit.AccessChannel channel) {
        return issue(actorUserId, payrollId, stepUpPassword, null, null, channel);
    }

    /**
     * 급여 발급. 가감조정(C-3)이 함께 오면 확정 전에 적용해, 사장이 화면에서 본 총액과
     * 서버가 확정하는 실수령액이 갈리지 않게 한다.
     */
    @Transactional
    public Payroll issue(Long actorUserId, Long payrollId, String stepUpPassword,
                         Integer adjustment, String adjustmentReason,
                         StoreDelegationAudit.AccessChannel channel) {
        Payroll payroll = lock(payrollId);
        Long storeId = payroll.getStore().getId();
        DelegatedActionAuthorityService.Authority authority =
                authorityService.require(actorUserId, storeId, ManagerPermission.PAYROLL_CONFIRM);
        stepUpAuthenticationService.verifyPassword(actorUserId, stepUpPassword);
        // 이미 지급 완료(PAID)된 급여는 금액을 다시 건드리지 않는다 — 재요청은 멱등해야 한다.
        if (adjustment != null && adjustment != 0 && payroll.getStatus() != PayrollStatus.PAID) {
            payroll.applyAdjustment(adjustment, adjustmentReason);
        }
        Payroll saved = payrollService.issuePayroll(payrollId);
        record(saved, authority, "ISSUED", channel);
        return saved;
    }

    /**
     * 멱등 재요청의 결과를 반환하기 전에 호출자의 매장 급여 권한을 다시 확인한다.
     * 재생은 step-up 비밀번호를 재검증하지 않지만, 다른 사용자가 키만 재사용해서
     * 급여 DTO를 읽을 수 있어서는 안 된다.
     */
    @Transactional(readOnly = true)
    public Long authorizeIssueRequest(Long actorUserId, Long payrollId) {
        Payroll payroll = payrollRepository.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));
        Long storeId = payroll.getStore().getId();
        authorityService.require(actorUserId, storeId, ManagerPermission.PAYROLL_CONFIRM);
        return storeId;
    }

    private Payroll lock(Long payrollId) {
        return payrollRepository.findByIdForUpdate(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("급여 내역을 찾을 수 없습니다."));
    }

    private void record(Payroll payroll, DelegatedActionAuthorityService.Authority authority, String result,
                        StoreDelegationAudit.AccessChannel channel) {
        auditRepository.save(StoreDelegationAudit.of(
                payroll.getStore().getId(), payroll.getEmployee().getId(), authority.ownerUserId(),
                authority.actorUserId(), authority.owner() ? StoreDelegationAudit.ActorType.MASTER
                        : StoreDelegationAudit.ActorType.MANAGER,
                StoreDelegationAudit.Action.PAYROLL_CONFIRMED, authority.permissions(),
                authority.delegationVersion(), authority.delegationEnvelopeId(), null,
                "password-step-up:" + result, channel));
    }
}
