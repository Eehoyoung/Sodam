package com.rich.sodam.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Anthropic Messages API 저수준 텍스트 정제 클라이언트(WP-0, {@code docs/260817} goal).
 *
 * <p>{@link com.rich.sodam.service.LlmLaborRiskNarrator}에 있던 HTTP 호출·타임아웃·응답 파싱을
 * 그대로 옮긴 것 — 판정/비식별화/검증 같은 도메인 로직은 포함하지 않는다(HC-6: 이 클라이언트를
 * 새 도메인마다 복제하지 말고 재사용할 것).</p>
 *
 * <p><b>활성 조건</b>: {@code sodam.ai.provider=anthropic}일 때만 빈으로 등록된다
 * ({@code com.rich.sodam.service.ClovaReceiptOcrClient}와 같은 값 기반 on/off 패턴).
 * 미설정이거나 {@link #isReady()}가 false면 {@link #complete(String)}는 네트워크를 타지 않고
 * 즉시 {@code null}을 반환한다 — 호출부가 원본 문구로 폴백하는 것은 이 클래스의 책임이 아니라
 * 각 도메인 서비스(예: LlmLaborRiskNarrator)의 책임이다.</p>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "sodam.ai.provider", havingValue = "anthropic")
public class AnthropicTextClient {

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public AnthropicTextClient(
            @Value("${sodam.ai.api-url:https://api.anthropic.com/v1/messages}") String apiUrl,
            @Value("${sodam.ai.api-key:}") String apiKey,
            @Value("${sodam.ai.model:claude-haiku-4-5-20251001}") String model,
            @Value("${sodam.ai.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${sodam.ai.read-timeout-ms:8000}") int readTimeoutMs) {
        this(buildRestTemplate(connectTimeoutMs, readTimeoutMs), apiUrl, apiKey, model);
    }

    /** 테스트/직접 구성용 — RestTemplate을 주입받아 MockRestServiceServer로 바인딩할 수 있다. */
    public AnthropicTextClient(RestTemplate restTemplate, String apiUrl, String apiKey, String model) {
        this.restTemplate = restTemplate;
        this.apiUrl = apiUrl == null ? "" : apiUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;

        if (this.apiKey.isBlank()) {
            log.warn("[AnthropicTextClient] provider=anthropic 활성 but api-key 미설정 — 항상 호출 스킵. "
                    + "SODAM_AI_API_KEY 를 설정하세요.");
        } else {
            log.info("[AnthropicTextClient] 준비 완료 — model={}", model);
        }
    }

    private static RestTemplate buildRestTemplate(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }

    public boolean isReady() {
        return !apiKey.isBlank();
    }

    /**
     * prompt를 Anthropic Messages API에 보내고 응답 텍스트만 돌려준다.
     * api-key 미설정·네트워크 실패·파싱 실패는 전부 흡수하고 {@code null}을 반환한다(fail-safe) —
     * 원본 문구로 되돌리는 폴백은 호출부(도메인 서비스)가 담당한다.
     */
    public String complete(String prompt) {
        if (!isReady() || prompt == null || prompt.isBlank()) {
            return null;
        }
        try {
            String json = objectMapper.writeValueAsString(buildRequestBody(prompt));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", "2023-06-01");

            ResponseEntity<String> res = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, new HttpEntity<>(json, headers), String.class);
            return parseResponseText(res.getBody());
        } catch (Exception e) {
            log.debug("[AnthropicTextClient] 호출 실패: {}", e.toString());
            return null;
        }
    }

    private Map<String, Object> buildRequestBody(String prompt) {
        return Map.of(
                "model", model,
                "max_tokens", 300,
                "messages", List.of(Map.of("role", "user", "content", prompt)));
    }

    /** Anthropic Messages API 응답 JSON → content[0].text 순수 파싱(외부 의존 없음, 단위 테스트 대상). */
    static String parseResponseText(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(json);
            JsonNode text = root.path("content").path(0).path("text");
            return text.isTextual() ? text.asText() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
