package com.rich.sodam.service;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;

@Disabled("Manual live Kakao API check only. Set KAKAO_REST_API_KEY locally before enabling.")
class KakaoManualApiTest {

    @Test
    void callKakaoAddressApiManually() {
        String restApiKey = System.getenv("KAKAO_REST_API_KEY");
        if (restApiKey == null || restApiKey.isBlank()) {
            throw new IllegalStateException("KAKAO_REST_API_KEY is required.");
        }

        String url = UriComponentsBuilder.fromUriString("https://dapi.kakao.com/v2/local/search/address.json")
                .queryParam("query", "경기 고양시 일산동구 고봉로 422")
                .queryParam("analyze_type", "similar")
                .encode(StandardCharsets.UTF_8)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + restApiKey);

        String response = new RestTemplate()
                .exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class)
                .getBody();

        System.out.println(response);
    }
}
