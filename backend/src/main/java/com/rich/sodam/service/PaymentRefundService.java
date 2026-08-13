package com.rich.sodam.service;

import com.rich.sodam.config.PaymentRefundProperties;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.PaymentSourceType;
import com.rich.sodam.repository.*;
import com.rich.sodam.service.support.AfterCommitExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * 네 결제 상품의 사용자 환불 신청 단일 진입점. 주문 소유권은 서버 저장값으로만 해석하며,
 * 결제키·금액을 클라이언트에서 받지 않는다. 성공한 PG 취소는 기존 웹훅 회수 로직과 같은 상태 전이를
 * 동기 적용해 mock에서도 요청→취소 반영을 검증할 수 있다.
 */
@Service
@RequiredArgsConstructor
public class PaymentRefundService {
    private final PaymentRefundRequestRepository requestRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final AttendanceCreditChargeOrderRepository attendanceOrderRepository;
    private final RecruitmentBoostPassOrderRepository boostOrderRepository;
    private final TaxServiceOrderRepository taxOrderRepository;
    private final PaymentRefundProperties refundProperties;
    private final IntegrationProperties integrationProperties;
    private final AfterCommitExecutor afterCommitExecutor;
    private final PaymentRefundProcessor paymentRefundProcessor;

    @Transactional
    public PaymentRefundRequest request(Long ownerUserId, PaymentSourceType sourceType, String orderId, String reason) {
        // 원주문을 먼저 잠가 동시 POST가 두 번의 PG cancel로 진입하는 것을 막는다. 요청 row의
        // unique 제약은 앱 재시작·예외 경로까지 막는 마지막 방어선이다.
        SourcePayment source = lockOwnedSource(ownerUserId, sourceType, orderId);
        PaymentRefundRequest existing = requestRepository.findBySourceTypeAndSourceOrderIdOrderByCreatedAtDesc(sourceType, orderId)
                .stream().filter(r -> r.getOwnerUserId().equals(ownerUserId)).findFirst().orElse(null);

        PaymentRefundRequest request;
        if (existing == null) {
            if (!source.paid()) throw new IllegalArgumentException("환불 가능한 본인 결제를 찾을 수 없습니다.");
            request = requestRepository.save(PaymentRefundRequest.request(
                    sourceType, orderId, ownerUserId, reason.trim(), source.amountKrw()));
        } else if (existing.getStatus() == PaymentRefundRequest.Status.FAILED) {
            // 주문당 신청 row 는 하나(uq_payment_refund_source)라 새 row 를 만들 수 없다. 실패한
            // 신청을 다시 대기로 돌려주지 않으면 이용자가 환불을 영영 다시 요청할 수 없다.
            existing.markRetryQueued();
            request = existing;
        } else {
            // 접수·처리 중이거나 이미 완료된 신청은 그대로 돌려준다(멱등).
            return existing;
        }

        // 기본은 mock만 자동 취소한다. live는 정책·세무 회신 전 REQUESTED로 보존하며, 회신 뒤
        // SODAM_PAYMENT_REFUND_AUTO_PROCESS_MODE=live 한 줄로 동일한 아래 메커니즘을 활성화한다.
        if (refundProperties.allows(integrationProperties.getToss().resolvedMode())) {
            Long requestId = request.getId();
            afterCommitExecutor.execute(() -> paymentRefundProcessor.process(requestId));
        }
        return request;
    }

    @Transactional(readOnly = true)
    public List<PaymentRefundRequest> myRequests(Long ownerUserId) {
        return requestRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    @Transactional(readOnly = true)
    public PaymentRefundRequest findById(Long requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalStateException("환불 신청을 찾을 수 없습니다."));
    }

    private SourcePayment lockOwnedSource(Long ownerUserId, PaymentSourceType type, String orderId) {
        return switch (type) {
            case SUBSCRIPTION -> paymentHistoryRepository.findByOrderIdForUpdate(orderId)
                    .filter(p -> p.getSubscription().getUser().getId().equals(ownerUserId))
                    .map(p -> new SourcePayment(p.getPaymentKey(), p.getAmount(), p.getStatus() == PaymentHistory.PaymentStatus.SUCCESS))
                    .orElseThrow(() -> new IllegalArgumentException("환불 가능한 본인 결제를 찾을 수 없습니다."));
            case ATTENDANCE_CREDIT_CHARGE -> attendanceOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getOwnerUserId().equals(ownerUserId))
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getAmountKrw(), o.isPaid()))
                    .orElseThrow(() -> new IllegalArgumentException("환불 가능한 본인 결제를 찾을 수 없습니다."));
            case RECRUITMENT_BOOST_PASS -> boostOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getOwnerUserId().equals(ownerUserId))
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getAmountKrw(), o.isPaid()))
                    .orElseThrow(() -> new IllegalArgumentException("환불 가능한 본인 결제를 찾을 수 없습니다."));
            case TAX_SERVICE -> taxOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getUser().getId().equals(ownerUserId))
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getCustomerAmount(), o.isPaid()))
                    .orElseThrow(() -> new IllegalArgumentException("환불 가능한 본인 결제를 찾을 수 없습니다."));
        };
    }
    private record SourcePayment(String paymentKey, int amountKrw, boolean paid) {}
}
