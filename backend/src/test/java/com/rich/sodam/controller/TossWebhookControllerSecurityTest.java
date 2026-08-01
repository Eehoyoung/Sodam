package com.rich.sodam.controller;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.service.TossWebhookService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class TossWebhookControllerSecurityTest {

    @Test
    void invalidWebhookSignatureIsNotWrittenToLogs(CapturedOutput output) {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getToss().setWebhookSecret("local-test-secret");
        TossWebhookController controller = new TossWebhookController(
                properties, mock(TossWebhookService.class));
        String suppliedSignature = "attacker-controlled-webhook-signature";

        controller.tossWebhook(suppliedSignature, "{\"eventType\":\"PAYMENT_STATUS_CHANGED\"}");

        assertThat(output).doesNotContain(suppliedSignature);
    }

    @Test
    void validWebhookSignatureStillDelegatesToWebhookService() throws Exception {
        IntegrationProperties properties = new IntegrationProperties();
        String secret = "local-test-secret";
        properties.getToss().setWebhookSecret(secret);
        TossWebhookService webhookService = mock(TossWebhookService.class);
        TossWebhookController controller = new TossWebhookController(properties, webhookService);
        String rawBody = "{\"eventType\":\"PAYMENT_STATUS_CHANGED\"}";

        var response = controller.tossWebhook(hmacSha256Base64(secret, rawBody), rawBody);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        verify(webhookService).processWebhookPayload(rawBody);
    }

    private static String hmacSha256Base64(String secret, String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}
