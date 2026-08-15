package com.rich.sodam.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rich.sodam.dto.response.LaborRiskResponse.Item;
import lombok.extern.slf4j.Slf4j;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * LLM 기반 노무 리스크 서술 내레이터 (Anthropic Messages API).
 *
 * <p><b>활성 조건</b>: {@code sodam.ai.provider}가 정확히 {@code anthropic}일 때만 빈으로
 * 등록된다({@link ConditionalOnProperty}{@code (havingValue = "anthropic")} — 값 존재 여부만
 * 보는 방식은 끄려는 의도로 아무 값이나 넣어도 켜져버리는 안전하지 않은 on/off이므로 채택하지
 * 않는다, {@code ClovaReceiptOcrClient} 선례 참고). 미설정·다른 값이면 이 빈은 생성되지 않고
 * {@link TemplateLaborRiskNarrator}(외부 호출 0)가 대신 동작한다. 유료 실키 활성화는 인간
 * 승인 사항이다(게이트 H-6).</p>
 *
 * <p><b>비식별화(HC-8)</b>: 직원명·전화·주소·계좌·employeeId는 페이로드에 싣지 않는다.
 * 규칙 엔진이 만든 메시지에서 실제 이름을 익명 라벨({@value #ANONYMOUS_LABEL})로 치환한
 * 뒤에만 전송하고, 응답을 받은 뒤 서버가 다시 실제 이름으로 되돌린다.</p>
 *
 * <p><b>판정 불변(HC-8)</b>: LLM에는 "말투만 다듬고 숫자·사실관계는 절대 바꾸지 말라"고
 * 명시하고, 응답에 원래 수치 문자열이 그대로 남아있는지·금지 표현(HC-1·HC-2)이 없는지
 * 검증한다. 하나라도 실패하면 원본 템플릿 문구로 폴백한다 — LLM이 판정을 바꾸면 버그다.</p>
 *
 * <p><b>실패 안전</b>: 네트워크·파싱·검증 실패는 전부 흡수하고 원본 메시지를 반환한다.
 * LLM이 죽어도 노무 리스크 대시보드는 계속 동작한다.</p>
 */
@Slf4j
@Component("laborRiskNarratorProvider")
@ConditionalOnProperty(name = "sodam.ai.provider", havingValue = "anthropic")
public class LlmLaborRiskNarrator implements LaborRiskNarrator {

    static final String ANONYMOUS_LABEL = "직원A";

    /** HC-1: 코드·문구·테스트 픽스처 어디에도 쓰지 않는 확언 표현. LLM 응답에 있으면 폴백. */
    static final List<String> FORBIDDEN_PHRASES = List.of(
            "위반입니다", "막아드립니다", "막아줍니다", "정확하게 계산", "법적 자문", "안전합니다",
            "위반이다", "확정적으로", "무조건", "100% ");

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LlmLaborRiskNarrator(
            @Value("${sodam.ai.api-url:https://api.anthropic.com/v1/messages}") String apiUrl,
            @Value("${sodam.ai.api-key:}") String apiKey,
            @Value("${sodam.ai.model:claude-haiku-4-5-20251001}") String model,
            @Value("${sodam.ai.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${sodam.ai.read-timeout-ms:8000}") int readTimeoutMs) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);

        if (this.apiKey.isBlank()) {
            log.warn("[LaborRiskNarrator] provider=anthropic 활성 but api-key 미설정 — 항상 템플릿 문구로 폴백. "
                    + "SODAM_AI_API_KEY 를 설정하세요.");
        } else {
            log.info("[LaborRiskNarrator] LLM 내레이터 준비 완료 — model={}", model);
        }
    }

    @Override
    public String narrate(Item item) {
        String original = item.message();
        if (apiKey.isBlank() || original == null || original.isBlank()) {
            return original;
        }
        try {
            String employeeName = item.employeeName();
            boolean hasName = employeeName != null && !employeeName.isBlank();
            String anonymized = hasName ? original.replace(employeeName, ANONYMOUS_LABEL) : original;

            String response = callAnthropic(buildPrompt(item, anonymized));
            if (response == null) {
                return original;
            }
            String rephrased = response.trim();
            if (!passesValidation(rephrased, item)) {
                return original;
            }
            return hasName ? rephrased.replace(ANONYMOUS_LABEL, employeeName) : rephrased;
        } catch (Exception e) {
            log.debug("[LaborRiskNarrator] LLM 서술 실패 — 템플릿 문구로 폴백. cause={}", e.toString());
            return original;
        }
    }

    static String buildPrompt(Item item, String anonymizedMessage) {
        return "다음은 소상공인 사장님용 앱이 이미 계산해 확정한 노무 리스크 안내 문구다. "
                + "말투만 자연스럽게 다듬어라. 숫자·사실관계·\"" + ANONYMOUS_LABEL + "\" 표기는 절대 바꾸지 마라. "
                + "법적 확언(위반이다/막아준다/안전합니다/정확하다 등)을 추가하지 마라. "
                + "리스크유형=" + item.type() + ", 심각도=" + item.severity() + ", 수치=" + item.value() + "\n\n"
                + "원문: " + anonymizedMessage;
    }

    private String callAnthropic(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", "2023-06-01");

        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", 300,
                "messages", List.of(Map.of("role", "user", "content", prompt)));
        try {
            String json = objectMapper.writeValueAsString(body);
            ResponseEntity<String> res = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, new HttpEntity<>(json, headers), String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode text = root.path("content").path(0).path("text");
            return text.isTextual() ? text.asText() : null;
        } catch (Exception e) {
            log.debug("[LaborRiskNarrator] Anthropic 호출 실패: {}", e.toString());
            return null;
        }
    }

    /** HC-1·HC-2 금지어 + 원래 수치 보존 여부 검증. 하나라도 실패하면 폴백 대상. */
    static boolean passesValidation(String rephrased, Item item) {
        if (rephrased == null || rephrased.isBlank()) {
            return false;
        }
        for (String banned : FORBIDDEN_PHRASES) {
            if (rephrased.contains(banned)) {
                return false;
            }
        }
        if (item.value() != null) {
            BigDecimal v = item.value();
            String stripped = v.stripTrailingZeros().toPlainString();
            if (!rephrased.contains(stripped) && !rephrased.contains(v.toPlainString())) {
                return false; // 수치가 사라지거나 바뀜 — 판정 변형 의심
            }
        }
        return true;
    }
}
