package com.rich.sodam.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.domain.PaymentHistory;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.SubscriptionStatus;
import com.rich.sodam.repository.PaymentHistoryRepository;

import java.time.LocalDateTime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.PublicEndpoint;
import jakarta.validation.Valid;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 토스페이먼츠 결제 상태 변경 웹훅.
 * 토스가 결제 성공/실패/취소 시 POST 호출. HMAC-SHA256 서명 검증으로 위변조 방지.
 *
 * 서명 헤더: X-TossPayments-Signature (Base64 인코딩된 HMAC-SHA256)
 * 키: webhookSecret
 */
@Slf4j
@PublicEndpoint
@RestController
@RequestMapping("/api/billing/webhook")
@RequiredArgsConstructor
@Tag(name = "구독·결제", description = "토스페이먼츠 웹훅 수신")
public class TossWebhookController {

    private final IntegrationProperties props;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Operation(summary = "토스 웹훅 수신", description = "결제 상태 변경 알림 처리. 서명 검증 필수.")
    @PostMapping("/toss")
    @Transactional
    public ResponseEntity<Void> tossWebhook(
            @RequestHeader(value = "X-TossPayments-Signature", required = false) String signature,
            @Valid @RequestBody String rawBody) {

        if (!verifySignature(rawBody, signature)) {
            log.warn("토스 웹훅 서명 검증 실패 sig={}", signature);
            return ResponseEntity.status(401).build();
        }

        try {
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
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("토스 웹훅 처리 오류", e);
            return ResponseEntity.status(500).build();
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

    private boolean verifySignature(String body, String signature) {
        if (signature == null) return false;
        String secret = props.getToss().getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            // 보안: secret 미설정은 곧 검증 불가 — 항상 거부.
            // 운영: SODAM_TOSS_WEBHOOK_SECRET 환경변수로 주입 필수.
            log.warn("webhook secret 미설정 — 모든 webhook 거부");
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String expected = Base64.getEncoder().encodeToString(hash);
            return constantTimeEquals(expected, signature);
        } catch (Exception e) {
            log.error("HMAC 계산 오류", e);
            return false;
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
