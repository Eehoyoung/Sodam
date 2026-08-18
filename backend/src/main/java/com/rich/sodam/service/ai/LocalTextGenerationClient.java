package com.rich.sodam.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/** OpenAI 호환 API를 제공하는 Ollama/vLLM용 최소 로컬 LLM 클라이언트. */
@Slf4j
@Component
@ConditionalOnProperty(name = "sodam.ai.provider", havingValue = "local")
public class LocalTextGenerationClient implements TextGenerationClient {

    private final RestTemplate restTemplate;
    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LocalTextGenerationClient(
            @Value("${sodam.ai.local-base-url:}") String baseUrl,
            @Value("${sodam.ai.local-api-key:}") String apiKey,
            @Value("${sodam.ai.model:}") String model,
            @Value("${sodam.ai.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${sodam.ai.read-timeout-ms:8000}") int readTimeoutMs) {
        this(buildRestTemplate(connectTimeoutMs, readTimeoutMs), baseUrl, apiKey, model);
    }

    LocalTextGenerationClient(RestTemplate restTemplate, String baseUrl, String apiKey, String model) {
        this.restTemplate = restTemplate;
        String normalized = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        this.apiUrl = normalized.isBlank() ? "" : normalized + "/chat/completions";
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
    }

    private static RestTemplate buildRestTemplate(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }

    @Override
    public boolean isReady() {
        return !apiUrl.isBlank() && !model.isBlank();
    }

    @Override
    public String complete(String prompt) {
        if (!isReady() || prompt == null || prompt.isBlank()) {
            return null;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (!apiKey.isBlank()) {
                headers.setBearerAuth(apiKey);
            }
            Map<String, Object> body = Map.of(
                    "model", model,
                    "max_tokens", 300,
                    "messages", List.of(Map.of("role", "user", "content", prompt)));
            String json = objectMapper.writeValueAsString(body);
            String response = restTemplate.postForObject(apiUrl, new HttpEntity<>(json, headers), String.class);
            return parseResponseText(response);
        } catch (Exception e) {
            log.debug("[LocalTextGenerationClient] 호출 실패: {}", e.toString());
            return null;
        }
    }

    static String parseResponseText(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode text = new ObjectMapper().readTree(json)
                    .path("choices").path(0).path("message").path("content");
            return text.isTextual() ? text.asText() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
