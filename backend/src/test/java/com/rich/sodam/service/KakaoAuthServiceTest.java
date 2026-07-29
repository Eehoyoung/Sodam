package com.rich.sodam.service;

import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * 카카오 OAuth 토큰 교환(getOauthToken) 요청 형식 검증.
 * client_secret 파라미터 누락은 카카오 콘솔에서 시크릿을 활성화한 앱에서 KOE010(Bad client
 * credentials)로 이어진다 — 시크릿 설정 시 요청에 반드시 포함되는지, POST + form-urlencoded
 * 형식을 지키는지 실제 네트워크 없이(MockRestServiceServer) 검증한다(testing.md 외부 API 의존 금지).
 */
@ExtendWith(MockitoExtension.class)
class KakaoAuthServiceTest {

    @Mock
    private UserRepository userRepository;

    private RestTemplate restTemplate;
    private MockRestServiceServer mockServer;
    private KakaoAuthService kakaoAuthService;

    @BeforeEach
    void setUp() {
        restTemplate = new RestTemplate();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        kakaoAuthService = new KakaoAuthService(userRepository, restTemplate);
    }

    @Test
    void 클라이언트_시크릿이_설정되면_토큰_요청에_client_secret을_포함한다() {
        ReflectionTestUtils.setField(kakaoAuthService, "clientSecret", "test-client-secret");

        mockServer.expect(requestTo("https://kauth.kakao.com/oauth/token"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().string(containsString("client_secret=test-client-secret")))
                .andRespond(withSuccess(
                        "{\"access_token\":\"at-1\",\"token_type\":\"bearer\"}",
                        MediaType.APPLICATION_JSON));

        String accessToken = kakaoAuthService.getAccessToken("auth-code", "sodam://oauth/kakao", "client-id-1");

        org.assertj.core.api.Assertions.assertThat(accessToken).isEqualTo("at-1");
        mockServer.verify();
    }

    @Test
    void 클라이언트_시크릿이_미설정이면_client_secret_파라미터를_생략한다() {
        ReflectionTestUtils.setField(kakaoAuthService, "clientSecret", null);

        mockServer.expect(requestTo("https://kauth.kakao.com/oauth/token"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().string(not(containsString("client_secret"))))
                .andRespond(withSuccess(
                        "{\"access_token\":\"at-2\",\"token_type\":\"bearer\"}",
                        MediaType.APPLICATION_JSON));

        String accessToken = kakaoAuthService.getAccessToken("auth-code", "sodam://oauth/kakao", "client-id-1");

        org.assertj.core.api.Assertions.assertThat(accessToken).isEqualTo("at-2");
        mockServer.verify();
    }
}
