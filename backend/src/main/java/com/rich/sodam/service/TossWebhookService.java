package com.rich.sodam.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.integration.PaymentLogRedactor;
import com.rich.sodam.config.integration.TossCancelProration;
import com.rich.sodam.domain.PaymentHistory;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.SubscriptionStatus;
import com.rich.sodam.repository.PaymentHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 토스페이먼츠 결제 상태 변경 웹훅 payload 처리(WP-09 2단계 — {@code TossWebhookController}의
 * repository 접근·object mapper 사용을 이관).
 *
 * <p>서명(HMAC) 검증은 HTTP 요청/헤더에 의존하는 컨트롤러 레이어 책임으로 남긴다 — 이 서비스는
 * 서명 검증을 통과한 payload의 결제 상태 반영만 담당한다.</p>
 *
 * <p><b>출근권 충전소(IAP) / 무제한 패스 라우팅</b>: 정기결제(구독) 웹훅은 {@code paymentKey}로
 * {@link PaymentHistory}를 찾지만, 출근권 충전 주문·무제한 패스 주문은 승인 전엔 paymentKey가
 * 없으므로 {@code orderId}로 찾는다. 세 테이블은 ID 스페이스가 겹치지 않으므로(각자 unique 주문
 * 식별자, "ACC_"/"RBP_" 접두사로도 구분됨) 한쪽만 매치되고 나머지는 자연히 no-op이다 — 그래서
 * orderId 하나로 두 서비스를 순서대로 시도해도 안전하다(각 서비스의 {@code applyFromWebhook}/
 * {@code cancelFromWebhook}은 자기 소유가 아닌 orderId에 대해 조용히 스킵한다).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TossWebhookService {

    private final PaymentHistoryRepository paymentHistoryRepository;
    private final AttendanceCreditChargeService attendanceCreditChargeService;
    private final RecruitmentBoostPassService recruitmentBoostPassService;
    private final TaxServiceOrderService taxServiceOrderService;
    private final PaymentReceiptService paymentReceiptService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void processWebhookPayload(String rawBody) throws com.fasterxml.jackson.core.JsonProcessingException {
        JsonNode payload = objectMapper.readTree(rawBody);
        JsonNode dataNode = payload.path("data");
        String eventType = payload.path("eventType").asText();
        String rawPaymentKey = dataNode.path("paymentKey").asText();
        String orderId = dataNode.path("orderId").asText(null);
        String status = dataNode.path("status").asText();
        String maskedKey = PaymentLogRedactor.redact(rawPaymentKey);
        log.info("토스 웹훅 수신 event={} status={} paymentKey={} orderId={}", eventType, status, maskedKey, orderId);

        // 취소 금액(cancelAmount/balanceAmount) 파싱 — CANCELED/PARTIAL_CANCELED 처리 시 회수량을
        // 비례 계산하는 데 쓰인다(recruitment-monetization-gamification-plan.md §12.2). DONE 등
        // 다른 상태에서는 이 값이 쓰이지 않으므로 파싱 비용은 무시할 만하다.
        TossCancelProration.ParsedCancelAmount cancelInfo = TossCancelProration.parseFromWebhookData(dataNode);

        boolean matchedSubscription = paymentHistoryRepository.findByPaymentKey(rawPaymentKey)
                .map(ph -> {
                    handleSubscriptionPayment(ph, rawPaymentKey, status);
                    return true;
                })
                .orElse(false);
        if (!matchedSubscription) {
            handleAttendanceCreditCharge(orderId, rawPaymentKey, status, cancelInfo);
            handleRecruitmentBoostPass(orderId, rawPaymentKey, status, cancelInfo);
            handleTaxServiceOrder(orderId, rawPaymentKey, status);
        }
    }

    private void handleSubscriptionPayment(PaymentHistory ph, String paymentKey, String status) {
        switch (status.toUpperCase()) {
            case "DONE" -> {
                ph.markSuccess(paymentKey);
                activateSubscriptionIfNeeded(ph);
                paymentReceiptService.recordPaid(com.rich.sodam.domain.type.PaymentSourceType.SUBSCRIPTION,
                        ph.getOrderId(), ph.getSubscription().getUser().getId(), paymentKey, ph.getAmount());
            }
            case "CANCELED", "PARTIAL_CANCELED" -> ph.markRefunded();
            case "ABORTED", "EXPIRED" -> ph.markFailed("webhook:" + status);
            default -> log.debug("처리하지 않는 상태(구독): {}", status);
        }
    }

    private void handleAttendanceCreditCharge(String orderId, String paymentKey, String status,
                                               TossCancelProration.ParsedCancelAmount cancelInfo) {
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        switch (status.toUpperCase()) {
            case "DONE" -> attendanceCreditChargeService.applyFromWebhook(orderId, paymentKey);
            case "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED" ->
                    attendanceCreditChargeService.cancelFromWebhook(orderId, status, cancelInfo);
            default -> log.debug("처리하지 않는 상태(출근권 충전): {}", status);
        }
    }

    private void handleRecruitmentBoostPass(String orderId, String paymentKey, String status,
                                             TossCancelProration.ParsedCancelAmount cancelInfo) {
        if (orderId == null || orderId.isBlank()) {
            return;
        }
        switch (status.toUpperCase()) {
            case "DONE" -> recruitmentBoostPassService.applyFromWebhook(orderId, paymentKey);
            case "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED" ->
                    recruitmentBoostPassService.cancelFromWebhook(orderId, status, cancelInfo);
            default -> log.debug("처리하지 않는 상태(무제한 패스): {}", status);
        }
    }

    private void handleTaxServiceOrder(String orderId, String paymentKey, String status) {
        if (orderId == null || orderId.isBlank()) return;
        switch (status.toUpperCase()) {
            case "DONE" -> taxServiceOrderService.applyFromWebhook(orderId, paymentKey);
            case "CANCELED", "PARTIAL_CANCELED", "ABORTED", "EXPIRED" -> taxServiceOrderService.cancelFromWebhook(orderId);
            default -> log.debug("처리하지 않는 상태(세무 서비스): {}", status);
        }
    }

    /**
     * 웹훅 DONE 시 구독 기간을 활성화(동기 청구가 누락된 경우의 백업). 이미 ACTIVE면 멱등 스킵해
     * 반복 웹훅에도 기간이 중복 연장되지 않는다.
     */
    private void activateSubscriptionIfNeeded(PaymentHistory ph) {
        Subscription s = ph.getSubscription();
        if (s == null || s.getStatus() == SubscriptionStatus.ACTIVE) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        s.activate(now, s.getBillingCycle().periodEndFrom(now));
        log.info("웹훅으로 구독 활성화 sub={} 기간만료={}", s.getId(), s.getCurrentPeriodEndAt());
    }
}
