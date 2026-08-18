package com.rich.sodam.service.ai;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LocalTextGenerationClientTest {

    @Test
    void callsOpenAiCompatibleEndpoint() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        LocalTextGenerationClient client = new LocalTextGenerationClient(
                restTemplate, "http://localhost:11434/v1/", "", "local-model");

        server.expect(requestTo("http://localhost:11434/v1/chat/completions"))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":"거래처A 비중이 가장 높아요."}}]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.complete("prompt")).isEqualTo("거래처A 비중이 가장 높아요.");
        server.verify();
    }

    @Test
    void missingConfigurationOrBadJsonFallsBackToNull() {
        assertThat(new LocalTextGenerationClient(new RestTemplate(), "", "", "").isReady()).isFalse();
        assertThat(LocalTextGenerationClient.parseResponseText("not-json")).isNull();
    }
}
