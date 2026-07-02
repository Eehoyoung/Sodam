package com.rich.sodam.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class kakaoTest {

    @Test
    public void testKakaoAddressApi() {
        String address = "경기도 고양시 덕양구 도래울로 16";
        String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
        String url = "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodedAddress;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + "28f9c414aad345b18a52dc62a3373603");
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        System.out.println("상태 코드: " + response.getStatusCode());
        System.out.println("응답 본문: " + response.getBody());
    }
}
