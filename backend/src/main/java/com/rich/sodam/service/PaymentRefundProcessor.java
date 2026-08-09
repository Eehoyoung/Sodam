package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossBillingClient;
import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.config.integration.TossPaymentGateway;
import com.rich.sodam.domain.*;
import com.rich.sodam.domain.type.PaymentSourceType;
import com.rich.sodam.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 이미 커밋된 PaymentRefundRequest를 처리하는 durable 후속 작업자. PG 호출 실패는 원 신청을
 * 잃지 않고 FAILED로 남아 운영 복구·재조회의 근거가 된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentRefundProcessor {
    private final PaymentRefundRequestRepository requestRepository;
    private final PaymentReceiptRepository receiptRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final AttendanceCreditChargeOrderRepository attendanceOrderRepository;
    private final RecruitmentBoostPassOrderRepository boostOrderRepository;
    private final TaxServiceOrderRepository taxOrderRepository;
    private final TossBillingClient tossBillingClient;
    private final TossPaymentGateway tossPaymentGateway;
    private final AttendanceCreditChargeService attendanceCreditChargeService;
    private final RecruitmentBoostPassService recruitmentBoostPassService;
    private final TaxServiceOrderService taxServiceOrderService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(Long requestId) {
        PaymentRefundRequest request = requestRepository.findById(requestId).orElse(null);
        if (request == null || request.getStatus() != PaymentRefundRequest.Status.REQUESTED) return;
        request.markProcessing();
        try {
            SourcePayment source = lockPaidSource(request.getOwnerUserId(), request.getSourceType(), request.getSourceOrderId());
            if (request.getSourceType() == PaymentSourceType.SUBSCRIPTION) {
                tossBillingClient.cancel(source.paymentKey(), request.getReason());
            } else {
                tossPaymentGateway.cancel(source.paymentKey(), request.getReason());
            }
            applyRefund(request.getSourceType(), request.getSourceOrderId(), source.amountKrw());
            receiptRepository.findBySourceTypeAndSourceOrderId(request.getSourceType(), request.getSourceOrderId())
                    .ifPresent(PaymentReceipt::markCancelled);
            request.markCompleted();
        } catch (RuntimeException e) {
            request.markFailed(e.getClass().getSimpleName());
            log.warn("환불 후속 처리 보류 requestId={} sourceType={}", requestId, request.getSourceType());
        }
    }

    private void applyRefund(PaymentSourceType sourceType, String orderId, int amountKrw) {
        switch (sourceType) {
            case SUBSCRIPTION -> paymentHistoryRepository.findByOrderIdForUpdate(orderId).ifPresent(PaymentHistory::markRefunded);
            case ATTENDANCE_CREDIT_CHARGE -> attendanceCreditChargeService.cancelFromWebhook(orderId, "CANCELED",
                    new TossCancelProration.ParsedCancelAmount(amountKrw, 0));
            case RECRUITMENT_BOOST_PASS -> recruitmentBoostPassService.cancelFromWebhook(orderId, "CANCELED",
                    new TossCancelProration.ParsedCancelAmount(amountKrw, 0));
            case TAX_SERVICE -> taxServiceOrderService.cancelFromWebhook(orderId);
        }
    }

    private SourcePayment lockPaidSource(Long ownerUserId, PaymentSourceType type, String orderId) {
        return switch (type) {
            case SUBSCRIPTION -> paymentHistoryRepository.findByOrderIdForUpdate(orderId)
                    .filter(p -> p.getSubscription().getUser().getId().equals(ownerUserId))
                    .filter(p -> p.getStatus() == PaymentHistory.PaymentStatus.SUCCESS)
                    .map(p -> new SourcePayment(p.getPaymentKey(), p.getAmount()))
                    .orElseThrow(() -> new IllegalStateException("환불 처리 대상 결제를 찾을 수 없습니다."));
            case ATTENDANCE_CREDIT_CHARGE -> attendanceOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getOwnerUserId().equals(ownerUserId) && o.isPaid())
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getAmountKrw()))
                    .orElseThrow(() -> new IllegalStateException("환불 처리 대상 결제를 찾을 수 없습니다."));
            case RECRUITMENT_BOOST_PASS -> boostOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getOwnerUserId().equals(ownerUserId) && o.isPaid())
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getAmountKrw()))
                    .orElseThrow(() -> new IllegalStateException("환불 처리 대상 결제를 찾을 수 없습니다."));
            case TAX_SERVICE -> taxOrderRepository.findByOrderIdForUpdate(orderId)
                    .filter(o -> o.getUser().getId().equals(ownerUserId) && o.isPaid())
                    .map(o -> new SourcePayment(o.getPaymentKey(), o.getCustomerAmount()))
                    .orElseThrow(() -> new IllegalStateException("환불 처리 대상 결제를 찾을 수 없습니다."));
        };
    }
    private record SourcePayment(String paymentKey, int amountKrw) {}
}
