package com.rich.sodam.service;

import com.rich.sodam.dto.response.GeocodingResult;
import com.rich.sodam.dto.response.KakaoApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeocodingService {

    private final RestTemplate restTemplate;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String kakaoApiKey;

    private static final String KAKAO_GEOCODING_ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";
    // 주소 필드는 URL/프로토콜/제어문자 포함 불가, 한글/영문/숫자/공백/쉼표/점/하이픈만 허용 (최대 200자)
    private static final Pattern SAFE_ADDRESS_PATTERN = Pattern.compile("^[\\p{L}\\p{N}\\s,.-]{1,200}$");

    @Transactional
    public GeocodingResult getCoordinates(String address) {
        try {
            String normalized = normalizeAndValidateAddress(address);

            String url = UriComponentsBuilder.fromHttpUrl(KAKAO_GEOCODING_ENDPOINT)
                    .queryParam("query", normalized)
                    .queryParam("analyze_type", "similar")
                    .encode(StandardCharsets.UTF_8)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);

            log.info("카카오 주소 검색 API 요청 시작");
            ResponseEntity<KakaoApiResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), KakaoApiResponse.class);

            KakaoApiResponse body = response.getBody();
            log.debug("카카오 API 응답: {}", body);

            if (body == null || body.getDocuments().isEmpty()) {
                log.warn("주소 검색 결과 없음: {}", normalized);
                throw new IllegalArgumentException("주소를 찾을 수 없습니다: " + normalized);
            }

            KakaoApiResponse.Documents document = body.getDocuments().get(0);

            // documents 객체에서 직접 위도/경도 가져오기
            Double latitude = Double.parseDouble(document.getLatitude());
            Double longitude = Double.parseDouble(document.getLongitude());

            String roadAddress = "";
            String jibunAddress = "";

            if (document.getRoadAddress() != null) {
                roadAddress = document.getRoadAddress().getAddressName();
            }

            if (document.getAddress() != null) {
                jibunAddress = document.getAddress().getAddressName();
            }

            return new GeocodingResult(latitude, longitude, roadAddress, jibunAddress, normalized);
        } catch (IllegalArgumentException e) {
            // 유효성 예외는 그대로 전달
            throw e;
        } catch (Exception e) {
            log.error("주소 변환 중 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("주소 변환 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * SSRF/XSS 방지를 위한 주소 입력 정규화 및 검증
     */
    private String normalizeAndValidateAddress(String address) {
        if (address == null) {
            throw new IllegalArgumentException("주소가 비어 있습니다.");
        }
        String trimmed = address.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("주소가 비어 있습니다.");
        }
        // 제어문자, 개행 제거
        String cleaned = trimmed.replaceAll("[\\r\\n\\t]", " ");
        if (!SAFE_ADDRESS_PATTERN.matcher(cleaned).matches()) {
            throw new IllegalArgumentException("주소에 허용되지 않는 문자가 포함되어 있습니다.");
        }
        return cleaned;
    }
}


/*
보안 메모:
- 외부 호출 호스트는 고정된 카카오 도메인만 사용합니다.
- 사용자 입력은 쿼리 파라미터로만 전달되며, 정규식 검증과 URI 인코딩을 거칩니다.
*/
