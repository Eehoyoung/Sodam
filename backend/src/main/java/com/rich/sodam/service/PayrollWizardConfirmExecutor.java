package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.StoreDelegationAudit;
import com.rich.sodam.dto.request.PayrollWizardConfirmRequest;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.dto.response.PayrollWizardConfirmResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 급여 정산 마법사 "확정"의 단일 트랜잭션 실행 단위 — {@link PayrollWizardService}와 별도 빈으로 분리한
 * 이유는 {@link PayrollStoreBatchService}/{@link PayrollBatchExecutor}와 동일하다: 같은 클래스 안에서
 * {@code this.issueAll(...)}로 자기호출하면 Spring AOP 프록시를 우회해 {@code @Transactional}이
 * 무의미해진다(CLAUDE.md 핵심 규칙). 이 실행기를 별도 빈으로 두어 프록시를 통해 호출되도록 한다.
 *
 * <p>단, {@link PayrollBatchExecutor}(계산, {@code REQUIRES_NEW} — 직원 1명 실패가 다른 직원에게
 * 영향을 주지 않아야 함)와 달리, 이 실행기는 <b>배치 전체를 하나의 트랜잭션</b>으로 묶는다
 * (전파 기본값 REQUIRED) — "여러 직원을 한 화면에서 검토 후 한 번에 확정"하는 웹 UX는 부분 성공이
 * 아니라 전부 성공/전부 실패가 사용자 기대에 맞는다(02_API_활용계획.md §6,
 * 05_동시성제어_및_고급아키텍처.md §5). 배치 중 하나라도 실패하면 이미 확정된 나머지도 롤백된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollWizardConfirmExecutor {

    private final PayrollHighRiskActionService payrollHighRiskActionService;

    @Transactional
    public PayrollWizardConfirmResponse issueAll(Long actorUserId, PayrollWizardConfirmRequest request) {
        List<PayrollDto> issued = request.payrollIds().stream()
                .map(payrollId -> {
                    Payroll payroll = payrollHighRiskActionService.issue(
                            actorUserId, payrollId, request.stepUpPassword(),
                            StoreDelegationAudit.AccessChannel.WEB);
                    return PayrollDto.from(payroll);
                })
                .toList();
        log.info("급여 정산 마법사 일괄 확정 완료 store={} count={}", request.storeId(), issued.size());
        return PayrollWizardConfirmResponse.of(request.storeId(), issued);
    }
}
