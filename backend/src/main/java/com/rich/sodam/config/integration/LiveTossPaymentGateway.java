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
 * 토스페이먼츠 단건결제 Live 게이트웨이.
 * 동작 조건: {@code sodam.integration.toss.mode=live} (실키는 {@link LiveTossBillingClient} 부팅 시 검증됨).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.toss", name = "mode", havingValue = "live")
public class LiveTossPaymentGateway implements TossPaymentGateway {

    private final IntegrationProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LiveTossPaymentGateway(IntegrationProperties props) {
        this.props = props;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(10_000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public ConfirmResult confirm(String paymentKey, String orderId, int amount) {
        String url = props.getToss().getBaseUrl() + "/v1/payments/confirm";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("paymentKey", paymentKey);
        body.put("orderId", orderId);
        body.put("amount", amount);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, authHeaders());
        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, req, String.class);
            JsonNode json = objectMapper.readTree(res.getBody());
            String confirmedKey = json.path("paymentKey").asText(paymentKey);
            String status = json.path("status").asText();
            if (!"DONE".equalsIgnoreCase(status)) {
                return ConfirmResult.fail("non-DONE status: " + status);
            }
            log.info("[Toss] 단건결제 승인 orderId={} status={}", orderId, status);
            return ConfirmResult.ok(confirmedKey, status);
        } catch (HttpStatusCodeException e) {
            log.warn("[Toss] confirm failed orderId={} status={} body={}",
                    orderId, e.getStatusCode(), e.getResponseBodyAsString());
            return ConfirmResult.fail("status=" + e.getStatusCode().value());
        } catch (Exception e) {
            log.error("[Toss] confirm error orderId={}", orderId, e);
            return ConfirmResult.fail(e.getClass().getSimpleName());
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
            log.info("[Toss] 단건결제 취소 paymentKey={}", paymentKey);
        } catch (Exception e) {
            log.error("[Toss] 단건결제 취소 실패 paymentKey={}", paymentKey, e);
            throw new IllegalStateException("토스 단건결제 취소 실패", e);
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        String token = Base64.getEncoder().encodeToString(
                (props.getToss().getSecretKey() + ":").getBytes(StandardCharsets.UTF_8));
        h.set("Authorization", "Basic " + token);
        return h;
    }
}
