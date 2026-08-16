package com.rich.sodam.service.ai;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * WP-0 — LlmLaborRiskNarrator에서 추출한 저수준 Anthropic 클라이언트 단위 테스트.
 * 실제 네트워크 없이 MockRestServiceServer로 정상 응답·타임아웃·파싱 실패 경로만 검증한다.
 */
class AnthropicTextClientTest {

    private static final String URL = "https://api.anthropic.com/v1/messages";

    @Test
    @DisplayName("api-key 미설정이면 isReady()가 false이고 complete()는 네트워크를 타지 않는다")
    void notReadyWhenApiKeyBlank() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AnthropicTextClient client = new AnthropicTextClient(restTemplate, URL, "", "claude-haiku-4-5-20251001");

        assertThat(client.isReady()).isFalse();
        assertThat(client.complete("아무 프롬프트")).isNull();

        server.verify(); // 등록된 expectation이 없으므로 요청이 전혀 나가지 않았어야 통과
    }

    @Test
    @DisplayName("정상 응답이면 content[0].text를 그대로 반환한다")
    void returnsTextOnSuccessfulResponse() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AnthropicTextClient client = new AnthropicTextClient(restTemplate, URL, "test-key", "claude-haiku-4-5-20251001");

        server.expect(requestTo(URL))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(header("x-api-key", "test-key"))
                .andExpect(header("anthropic-version", "2023-06-01"))
                .andRespond(withSuccess("""
                        {
                          "content": [
                            { "type": "text", "text": "다듬어진 문장입니다." }
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.complete("원본 프롬프트")).isEqualTo("다듬어진 문장입니다.");
        server.verify();
    }

    @Test
    @DisplayName("응답 JSON에 content가 없으면(파싱 실패) null을 반환한다")
    void returnsNullWhenResponseBodyUnparseable() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AnthropicTextClient client = new AnthropicTextClient(restTemplate, URL, "test-key", "claude-haiku-4-5-20251001");

        server.expect(requestTo(URL))
                .andRespond(withSuccess("{\"error\": \"malformed\"}", MediaType.APPLICATION_JSON));

        assertThat(client.complete("원본 프롬프트")).isNull();
        server.verify();
    }

    @Test
    @DisplayName("응답 본문이 JSON이 아니면(파싱 예외) null을 반환한다")
    void returnsNullOnInvalidJson() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AnthropicTextClient client = new AnthropicTextClient(restTemplate, URL, "test-key", "claude-haiku-4-5-20251001");

        server.expect(requestTo(URL))
                .andRespond(withSuccess("이건 JSON이 아니다", MediaType.TEXT_PLAIN));

        assertThat(client.complete("원본 프롬프트")).isNull();
        server.verify();
    }

    @Test
    @DisplayName("타임아웃(IOException)이 발생하면 예외를 흡수하고 null을 반환한다")
    void returnsNullOnTimeout() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        AnthropicTextClient client = new AnthropicTextClient(restTemplate, URL, "test-key", "claude-haiku-4-5-20251001");

        server.expect(requestTo(URL))
                .andRespond(request -> {
                    throw new SocketTimeoutException("simulated read timeout");
                });

        assertThat(client.complete("원본 프롬프트")).isNull();
        server.verify();
    }

    @Test
    @DisplayName("Spring 생성자는 provider 조건 충족 시 타임아웃이 설정된 RestTemplate으로 정상 구성된다")
    void springConstructorBuildsReadyClientWhenApiKeyPresent() {
        AnthropicTextClient client = new AnthropicTextClient(
                URL, "test-key", "claude-haiku-4-5-20251001", 100, 100);

        assertThat(client.isReady()).isTrue();
    }
}
