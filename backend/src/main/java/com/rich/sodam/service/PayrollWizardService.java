package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.request.PayrollWizardConfirmRequest;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.dto.response.PayrollWizardConfirmResponse;
import com.rich.sodam.service.idempotency.RequestIdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 사장님 웹 콘솔 급여 정산 마법사 3단계("대상선정→계산확인→확정") — 마지막 "확정" 단계 오케스트레이션.
 *
 * <p>1·2단계(대상선정·계산확인)는 기존 {@code POST /api/payroll/calculate}(employeeId 미지정 시
 * 매장 일괄 계산 모드)가 이미 제공한다 — 사장이 검토할 DRAFT 급여 목록을 반환하는 순수 조회성
 * 프리뷰라 별도 신규 엔드포인트가 필요 없다고 판단했다. 반면 "여러 직원을 한 화면에서 검토 후
 * 한 번에 확정"하는 마지막 단계는 기존 {@code PUT /{payrollId}/issue}를 프론트가 N번 순차 호출하는
 * 방식으로는 트랜잭션 경계를 백엔드가 가질 수 없어(부분 성공 시 정합성 불명확), 02_API_활용계획.md
 * §6·05_동시성제어_및_고급아키텍처.md §5 결정대로 신규 배치 엔드포인트를 둔다.
 *
 * <p>실제 확정 로직({@link PayrollHighRiskActionService#issue})은 {@link PayrollWizardConfirmExecutor}를
 * 통해 그대로 재사용한다 — step-up 재인증·위임 재검증·행위자 감사 기록을 중복 구현하지 않는다.
 * ⛔ 이 서비스는 사장 본인만 호출 가능한 {@code @MasterOnly} 컨트롤러에서만 진입하며, 매니저 위임
 * ({@code PAYROLL_CONFIRM}) 흐름을 새로 노출·확장하지 않는다 — {@code PayrollHighRiskActionService.issue}가
 * 내부적으로 매니저 위임도 지원하지만, 이 진입점에는 매니저가 도달할 수 없다({@code @MasterOnly}가 원천 차단).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayrollWizardService {

    private final PayrollService payrollService;
    private final PayrollWizardConfirmExecutor confirmExecutor;
    private final RequestIdempotencyService requestIdempotencyService;

    public PayrollWizardConfirmResponse confirm(Long actorUserId, PayrollWizardConfirmRequest request,
                                                String idempotencyKey) {
        // 요청에 포함된 payrollId 전부가 실제로 request.storeId() 소속인지 먼저 확인한다(BOLA 방지) —
        // 아래 issue()도 개별적으로 권한을 재검증하지만, 배치 진입점 레벨에서도 조기에 걸러낸다.
        assertAllBelongToStore(request.storeId(), request.payrollIds());

        String scope = "payroll-wizard-confirm:" + request.storeId();
        return requestIdempotencyService.execute(idempotencyKey, scope,
                () -> confirmExecutor.issueAll(actorUserId, request),
                // 재요청(동일 Idempotency-Key): step-up 재검증·중복 감사기록 없이 현재 상태만 재조회.
                () -> replay(request));
    }

    private PayrollWizardConfirmResponse replay(PayrollWizardConfirmRequest request) {
        List<PayrollDto> issued = request.payrollIds().stream()
                .map(payrollId -> PayrollDto.from(payrollService.getPayrollById(payrollId)))
                .toList();
        return PayrollWizardConfirmResponse.of(request.storeId(), issued);
    }

    private void assertAllBelongToStore(Long storeId, List<Long> payrollIds) {
        for (Long payrollId : payrollIds) {
            Payroll payroll = payrollService.getPayrollById(payrollId);
            if (payroll.getStore() == null || !storeId.equals(payroll.getStore().getId())) {
                log.warn("급여 정산 마법사 확정 거부: payroll {} 가 store {} 소속이 아님", payrollId, storeId);
                throw new AccessDeniedException("요청한 급여 중 해당 매장 소속이 아닌 항목이 있어요.");
            }
        }
    }
}
