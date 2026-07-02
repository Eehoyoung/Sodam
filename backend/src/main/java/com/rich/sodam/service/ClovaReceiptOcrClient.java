package com.rich.sodam.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 네이버 CLOVA OCR Receipt 실(實) 클라이언트.
 *
 * <p><b>활성 조건</b>: {@code sodam.ocr.provider} 프로퍼티가 설정된 경우에만 빈으로 등록된다
 * ({@link ConditionalOnProperty}). 빈 이름은 {@code receiptOcrProvider} 로,
 * {@link NoopReceiptOcrClient} 의 {@code @ConditionalOnMissingBean(name="receiptOcrProvider")}
 * 를 무력화해 자동으로 Noop 을 대체한다. 즉 <b>env 키 미설정 시 외부 호출 0, 수기입력 Noop 유지</b>.
 *
 * <p><b>비용/실패 안전</b>: 네트워크·파싱 예외는 모두 삼키고 {@link ReceiptDraft#empty()} 를 반환해
 * 매입장부 비즈니스 흐름을 절대 막지 않는다(인식 실패 시 사장 수기입력으로 진행).
 *
 * <p><b>PII</b>: 영수증 이미지·OCR 응답 원본은 저장하지 않는다. 파싱된 초안(품목·단가)만 반환한다.
 *
 * <p>참고: https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocrdocumentocr-receipt
 */
@Slf4j
@Component("receiptOcrProvider")
@ConditionalOnProperty(name = "sodam.ocr.provider")
public class ClovaReceiptOcrClient implements ReceiptOcrClient {

    private final String apiUrl;
    private final String secretKey;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ClovaReceiptOcrClient(
            @Value("${sodam.ocr.api-url:}") String apiUrl,
            @Value("${sodam.ocr.secret-key:}") String secretKey,
            @Value("${sodam.ocr.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${sodam.ocr.read-timeout-ms:15000}") int readTimeoutMs) {
        this.apiUrl = apiUrl == null ? "" : apiUrl.trim();
        this.secretKey = secretKey == null ? "" : secretKey.trim();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restTemplate = new RestTemplate(factory);

        if (this.apiUrl.isBlank() || this.secretKey.isBlank()) {
            // provider 는 켰지만 url/secret 누락 → 호출 시도 자체를 막고 Noop 과 동일 동작(빈 초안).
            log.warn("[CLOVA OCR] provider 활성 but api-url/secret-key 미설정 — 외부 호출 없이 빈 초안 반환. " +
                    "SODAM_OCR_API_URL / SODAM_OCR_SECRET_KEY 를 .env 에 설정하세요.");
        } else {
            log.info("[CLOVA OCR] 영수증 OCR 클라이언트 준비 완료 — apiUrl={}", maskUrl(this.apiUrl));
        }
    }

    @Override
    public ReceiptDraft parse(byte[] image, String contentType) {
        if (apiUrl.isBlank() || secretKey.isBlank() || image == null || image.length == 0) {
            return ReceiptDraft.empty();
        }
        try {
            String body = objectMapper.writeValueAsString(buildRequest(image, contentType));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-OCR-SECRET", secretKey);

            ResponseEntity<String> res = restTemplate.exchange(
                    apiUrl, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);

            return parseClovaResponse(res.getBody());
        } catch (Exception e) {
            // 외부 의존이 매입 흐름을 막지 않도록 모든 예외를 흡수 — 사장 수기입력으로 진행.
            log.warn("[CLOVA OCR] 인식 실패 — 빈 초안 반환(수기입력). cause={}", e.toString());
            return ReceiptDraft.empty();
        }
    }

    /** CLOVA Receipt V2 요청 바디(JSON). 이미지는 base64 로 인라인 전송. */
    private Map<String, Object> buildRequest(byte[] image, String contentType) {
        Map<String, Object> img = new LinkedHashMap<>();
        img.put("format", toImageFormat(contentType));
        img.put("name", "receipt");
        img.put("data", Base64.getEncoder().encodeToString(image));

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("version", "V2");
        root.put("requestId", UUID.randomUUID().toString());
        root.put("timestamp", System.currentTimeMillis());
        root.put("images", List.of(img));
        return root;
    }

    private static String toImageFormat(String contentType) {
        if (contentType == null) return "jpg";
        String ct = contentType.toLowerCase();
        if (ct.contains("png")) return "png";
        if (ct.contains("pdf")) return "pdf";
        if (ct.contains("tif")) return "tiff";
        return "jpg";
    }

    private static String maskUrl(String url) {
        int q = url.indexOf('?');
        return q >= 0 ? url.substring(0, q) : url;
    }

    /**
     * CLOVA Receipt 응답 JSON → {@link ReceiptDraft} 순수 변환(외부 의존 없음, 단위 테스트 대상).
     *
     * <p>매핑:
     * <ul>
     *   <li>상호명 ← {@code images[0].receipt.result.storeInfo.name} (formatted.value 우선, 없으면 text)</li>
     *   <li>구매일 ← {@code paymentInfo.date.formatted}(year/month/day) → 실패 시 null</li>
     *   <li>품목 ← {@code subResults[].items[]}: name→itemName, count→quantity, price.unitPrice→unitPrice</li>
     * </ul>
     * 파싱 불가/필드 누락은 해당 필드만 null/0/기본값으로 두고 흐름은 유지한다.
     */
    static ReceiptDraft parseClovaResponse(String json) {
        if (json == null || json.isBlank()) {
            return ReceiptDraft.empty();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(json);
            JsonNode result = root.path("images").path(0).path("receipt").path("result");
            if (result.isMissingNode()) {
                return ReceiptDraft.empty();
            }

            String vendorName = readField(result.path("storeInfo").path("name"));
            LocalDate purchaseDate = readDate(result.path("paymentInfo").path("date"));

            List<DraftItem> items = new ArrayList<>();
            for (JsonNode sub : result.path("subResults")) {
                for (JsonNode item : sub.path("items")) {
                    String name = readField(item.path("name"));
                    if (name == null || name.isBlank()) {
                        continue; // 품목명 없는 행은 의미 없음
                    }
                    double quantity = readDouble(item.path("count"), 1.0);
                    int unitPrice = readInt(item.path("price").path("unitPrice"));
                    if (unitPrice == 0) {
                        // 단가가 비면 total/price 로 보정 시도(단가 미표기 영수증 대응)
                        unitPrice = readInt(item.path("price").path("price"));
                    }
                    items.add(new DraftItem(name.trim(), quantity, null, unitPrice));
                }
            }

            return new ReceiptDraft(vendorName, purchaseDate, null, items);
        } catch (Exception e) {
            return ReceiptDraft.empty();
        }
    }

    /** formatted.value 우선, 없으면 text. 둘 다 없으면 null. */
    private static String readField(JsonNode node) {
        if (node == null || node.isMissingNode()) return null;
        JsonNode formatted = node.path("formatted").path("value");
        if (formatted.isTextual() && !formatted.asText().isBlank()) {
            return formatted.asText();
        }
        JsonNode text = node.path("text");
        return text.isTextual() && !text.asText().isBlank() ? text.asText() : null;
    }

    /** paymentInfo.date.formatted(year/month/day) → LocalDate. 실패 시 null. */
    private static LocalDate readDate(JsonNode dateNode) {
        if (dateNode == null || dateNode.isMissingNode()) return null;
        try {
            JsonNode f = dateNode.path("formatted");
            int y = parseIntSafe(f.path("year").asText(""));
            int m = parseIntSafe(f.path("month").asText(""));
            int d = parseIntSafe(f.path("day").asText(""));
            if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                if (y < 100) y += 2000; // 2자리 연도 보정
                return LocalDate.of(y, m, d);
            }
        } catch (Exception ignored) {
            // 비표준 날짜는 무시 — 사장이 수기 보정
        }
        return null;
    }

    private static double readDouble(JsonNode node, double fallback) {
        String v = readField(node);
        if (v == null) return fallback;
        try {
            double parsed = Double.parseDouble(v.replaceAll("[^0-9.\\-]", ""));
            return parsed <= 0 ? fallback : parsed;
        } catch (Exception e) {
            return fallback;
        }
    }

    private static int readInt(JsonNode node) {
        String v = readField(node);
        if (v == null) return 0;
        return parseIntSafe(v.replaceAll("[^0-9\\-]", ""));
    }

    private static int parseIntSafe(String s) {
        if (s == null || s.isBlank()) return 0;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
