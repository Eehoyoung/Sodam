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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeocodingService {

    private final RestTemplate restTemplate;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String kakaoApiKey;

    @Transactional
    public GeocodingResult getCoordinates(String address) {
        try {
            String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
            // analyze_type=similar 추가
            String url = "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodedAddress + "&analyze_type=similar";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);

            log.info("카카오 주소 검색 API 요청: {}", url);
            ResponseEntity<KakaoApiResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), KakaoApiResponse.class);

            KakaoApiResponse body = response.getBody();
            log.debug("카카오 API 응답: {}", body);

            if (body == null || body.getDocuments().isEmpty()) {
                log.warn("주소 검색 결과 없음: {}", address);
                throw new IllegalArgumentException("주소를 찾을 수 없습니다: " + address);
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

            return new GeocodingResult(latitude, longitude, roadAddress, jibunAddress, address);
        } catch (Exception e) {
            log.error("주소 변환 중 오류 발생: {}", e.getMessage(), e);
            throw new RuntimeException("주소 변환 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}


/*
1. API 키 발급:
    - 카카오 개발자 사이트([https://developers.kakao.com](https://developers.kakao.com))에 회원가입 및 로그인
    - 애플리케이션 추가를 통해 앱 생성
    - "플랫폼" 설정에서 웹 플랫폼 등록 (localhost도 가능)
    - "앱 키"에서 REST API 키 확인

2. API 키 설정:
    - application.yml 또는 properties 파일에 위에 제공된 형식으로 API 키 저장

3. API 호출:
    - GeocodingService 클래스를 통해 주소를 좌표로 변환
    - Store 엔티티 등록/수정 시 위 서비스 호출하여 좌표 정보 저장

4. 테스트:
    - Postman 또는 curl을 사용해 API 엔드포인트 테스트
    - 매장 등록 시 주소 필드를 추가하고, 컨트롤러에서 GeocodingService 호출

 */