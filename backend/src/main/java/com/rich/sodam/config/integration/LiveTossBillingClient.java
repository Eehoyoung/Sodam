package com.rich.sodam.config.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
