package com.rich.sodam.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TossWebhookService {

    private final PaymentHistoryRepository paymentHistoryRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void processWebhookPayload(String rawBody) throws com.fasterxml.jackson.core.JsonProcessingException {
        JsonNode payload = objectMapper.readTree(rawBody);
        String eventType = payload.path("eventType").asText();
        String paymentKey = payload.path("data").path("paymentKey").asText();
        String status = payload.path("data").path("status").asText();
        log.info("토스 웹훅 수신 event={} status={} paymentKey={}", eventType, status, paymentKey);

        paymentHistoryRepository.findByPaymentKey(paymentKey).ifPresent(ph -> {
            switch (status.toUpperCase()) {
                case "DONE" -> {
                    ph.markSuccess(paymentKey);
                    activateSubscriptionIfNeeded(ph);
                }
                case "CANCELED", "PARTIAL_CANCELED" -> ph.markRefunded();
                case "ABORTED", "EXPIRED" -> ph.markFailed("webhook:" + status);
                default -> log.debug("처리하지 않는 상태: {}", status);
            }
        });
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
