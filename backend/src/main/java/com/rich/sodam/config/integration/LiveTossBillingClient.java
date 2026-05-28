package com.rich.sodam.config.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 토스페이먼츠 빌링 Live 클라이언트.
 * 동작 조건: {@code sodam.integration.toss.mode=live}
 * 참고: https://docs.tosspayments.com/reference/billing
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.toss", name = "mode", havingValue = "live")
public class LiveTossBillingClient implements TossBillingClient {

    private final IntegrationProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LiveTossBillingClient(IntegrationProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(10_000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * 라이브 모드 부팅 시 토스 키 존재 검증 — 빈 키로 운영 진입 차단(보안/장애 예방).
     * mode=live 인데 secret/client 키가 비면 부팅 자체 실패시키고 명확한 메시지를 남긴다.
     * webhook secret 은 권장이지만 비면 TossWebhookController 가 모든 webhook 을 거부하도록
     * 이미 처리됨(IntegrationProperties.Toss.webhookSecret 주석 참조).
     */
    @PostConstruct
    void validateKeys() {
        IntegrationProperties.Toss t = props.getToss();
        String sk = t.getSecretKey();
        String ck = t.getClientKey();
        if (sk == null || sk.isBlank() || "test_sk_dev".equals(sk)
                || ck == null || ck.isBlank() || "test_ck_dev".equals(ck)) {
            throw new IllegalStateException(
                "[TOSS LIVE] 실키 미설정 — sodam.integration.toss.mode=live 인데 secret-key/client-key 가 비었거나 dev 기본값입니다. " +
                ".env 에 TOSS_SECRET_KEY/TOSS_CLIENT_KEY 를 입력하거나 mode 를 mock 으로 되돌리세요.");
        }
        if (t.getWebhookSecret() == null || t.getWebhookSecret().isBlank()) {
            log.warn("[TOSS LIVE] webhook-secret 미설정 — webhook 수신이 차단됩니다. 정기결제 결과 동기화 위해 TOSS_WEBHOOK_SECRET 권장.");
        }
        log.info("[TOSS LIVE] 클라이언트 준비 완료 — baseUrl={}, clientKey={}...", t.getBaseUrl(), ck.substring(0, Math.min(8, ck.length())));
    }

    @Override
    public BillingKeyResult issueBillingKey(String authKey, String customerKey) {
        String url = props.getToss().getBaseUrl() + "/v1/billing/authorizations/issue";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authKey", authKey);
        body.put("customerKey", customerKey);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, authHeaders());
        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, req, String.class);
            JsonNode json = objectMapper.readTree(res.getBody());
            String billingKey = json.path("billingKey").asText();
            String cardCompany = json.path("card").path("company").asText("");
            String cardNumber = json.path("card").path("number").asText("");
            String cardLabel = (cardCompany + " " + cardNumber).trim();
            log.info("[Toss] billingKey issued customerKey={}", customerKey);
            return new BillingKeyResult(billingKey, cardLabel, customerKey);
        } catch (HttpStatusCodeException e) {
            log.error("[Toss] issueBillingKey failed: {} {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException("토스 빌링키 발급 실패: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("[Toss] issueBillingKey error", e);
            throw new IllegalStateException("토스 빌링키 발급 중 오류", e);
        }
    }

    @Override
    public ChargeResult charge(ChargeRequest request) {
        String url = props.getToss().getBaseUrl() + "/v1/billing/" + request.getBillingKey();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("customerKey", request.getCustomerKey());
        body.put("amount", request.getAmount());
        body.put("orderId", request.getOrderId());
        body.put("orderName", request.getOrderName());
        if (request.getCustomerEmail() != null) body.put("customerEmail", request.getCustomerEmail());
        if (request.getCustomerName() != null) body.put("customerName", request.getCustomerName());

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, authHeaders());
        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, req, String.class);
            JsonNode json = objectMapper.readTree(res.getBody());
            String paymentKey = json.path("paymentKey").asText();
            String statusCode = json.path("status").asText();
            if (!"DONE".equalsIgnoreCase(statusCode)) {
                return ChargeResult.fail("non-DONE status: " + statusCode);
            }
            return ChargeResult.ok(paymentKey);
        } catch (HttpStatusCodeException e) {
            log.warn("[Toss] charge failed orderId={} status={} body={}",
                    request.getOrderId(), e.getStatusCode(), e.getResponseBodyAsString());
            return ChargeResult.fail("status=" + e.getStatusCode().value());
        } catch (Exception e) {
            log.error("[Toss] charge error", e);
            return ChargeResult.fail(e.getClass().getSimpleName());
        }
    }

    @Override
    public void cancel(String paymentKey, String reason) {
        String url = props.getToss().getBaseUrl() + "/v1/payments/" + paymentKey + "/cancel";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cancelReason", reason);
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, authHeaders());
        try {
            restTemplate.exchange(url, HttpMethod.POST, req, String.class);
            log.info("[Toss] cancel paymentKey={}", paymentKey);
        } catch (Exception e) {
            log.error("[Toss] cancel error", e);
            throw new IllegalStateException("토스 결제 취소 실패", e);
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        String token = Base64.getEncoder().encodeToString(
                (props.getToss().getSecretKey() + ":").getBytes(StandardCharsets.UTF_8)
        );
        h.set("Authorization", "Basic " + token);
        return h;
    }
}
