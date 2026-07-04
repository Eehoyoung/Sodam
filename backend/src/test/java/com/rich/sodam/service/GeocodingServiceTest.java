package com.rich.sodam.service;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.dto.response.GeocodingResult;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeocodingServiceTest {

    @Test
    void liveGeocode_requestsKakaoAddressApiAndMapsCoordinates() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

        IntegrationProperties properties = new IntegrationProperties();
        properties.getKakao().setMode("live");
        properties.getKakao().setBaseUrl("https://dapi.kakao.com");
        properties.getKakao().setRestApiKey("test-rest-api-key");

        GeocodingService service = new GeocodingService(restTemplate, properties);

        server.expect(request -> {
                    assertThat(request.getMethod().name()).isEqualTo("GET");
                    assertThat(request.getURI().getScheme()).isEqualTo("https");
                    assertThat(request.getURI().getHost()).isEqualTo("dapi.kakao.com");
                    assertThat(request.getURI().getPath()).isEqualTo("/v2/local/search/address.json");
                    assertThat(URLDecoder.decode(request.getURI().getQuery(), StandardCharsets.UTF_8))
                            .contains("query=경기 고양시 일산동구 고봉로 422")
                            .contains("analyze_type=similar");
                    assertThat(request.getHeaders().getFirst("Authorization"))
                            .isEqualTo("KakaoAK test-rest-api-key");
                })
                .andRespond(withSuccess("""
                        {
                          "meta": {
                            "total_count": 1,
                            "pageable_count": 1,
                            "is_end": true
                          },
                          "documents": [
                            {
                              "address_name": "경기 고양시 일산동구 고봉로 422",
                              "y": "37.677420123456",
                              "x": "126.793540987654",
                              "address_type": "ROAD_ADDR",
                              "address": {
                                "address_name": "경기 고양시 일산동구 중산동 1",
                                "x": "126.793540987654",
                                "y": "37.677420123456"
                              },
                              "road_address": {
                                "address_name": "경기 고양시 일산동구 고봉로 422",
                                "zone_no": "10338",
                                "x": "126.793540987654",
                                "y": "37.677420123456"
                              }
                            }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        GeocodingResult result = service.getCoordinates("경기 고양시 일산동구 고봉로 422");

        assertThat(result.getLatitude()).isEqualTo(37.677420123456);
        assertThat(result.getLongitude()).isEqualTo(126.793540987654);
        assertThat(result.getRoadAddress()).isEqualTo("경기 고양시 일산동구 고봉로 422");
        assertThat(result.getJibunAddress()).isEqualTo("경기 고양시 일산동구 중산동 1");
        assertThat(result.getFullAddress()).isEqualTo("경기 고양시 일산동구 고봉로 422");
        server.verify();
    }

    @Test
    void liveGeocode_requiresRestApiKey() {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getKakao().setMode("live");

        GeocodingService service = new GeocodingService(new RestTemplate(), properties);

        assertThatThrownBy(() -> service.getCoordinates("경기 고양시 일산동구 고봉로 422"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Kakao REST API key is required");
    }
}
