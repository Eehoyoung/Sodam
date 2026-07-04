package com.rich.sodam.config.integration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 외부 통합 서비스 동작 모드 + 키 설정.
 *
 * 각 서비스마다 mode 값으로 동작이 갈린다:
 *   - mock : API 호출 대신 결정적 가짜 응답 (에뮬레이터/CI)
 *   - live : 실제 외부 API 호출 (운영)
 *   - off  : 비활성 (호출 시 즉시 예외 또는 no-op)
 *
 * application-{profile}.yml 의 'sodam.integration.*' 트리에서 매핑된다.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "sodam.integration")
public class IntegrationProperties {

    private Toss toss = new Toss();
    private Fcm fcm = new Fcm();
    private Sentry sentry = new Sentry();
    private Kakao kakao = new Kakao();
    private ChannelTalk channelTalk = new ChannelTalk();

    public enum Mode {
        MOCK, LIVE, OFF;

        public static Mode parse(String value) {
            if (value == null) return MOCK;
            try {
                return valueOf(value.trim().toUpperCase());
            } catch (Exception e) {
                return MOCK;
            }
        }
    }

    @Getter
    @Setter
    public static class Toss {
        private String mode = "mock";
        // mock 모드 전용 샌드박스 키. live 모드 진입 시 TossBillingClient 가 빈 값 검증.
        private String clientKey = "test_ck_dev";
        private String secretKey = "test_sk_dev";
        private String baseUrl = "https://api.tosspayments.com";
        // 보안: webhook 서명 검증용. 비어있으면 TossWebhookController 가 모든 webhook 거부.
        private String webhookSecret = "";

        public Mode resolvedMode() {
            return Mode.parse(mode);
        }
    }

    @Getter
    @Setter
    public static class Fcm {
        private String mode = "mock";
        private String projectId = "sodam-dev";
        private String credentialsPath = "";

        public Mode resolvedMode() {
            return Mode.parse(mode);
        }
    }

    @Getter
    @Setter
    public static class Sentry {
        private String mode = "off";
        private String dsn = "";
        private String environment = "dev";
        private double tracesSampleRate = 0.0;

        public Mode resolvedMode() {
            return Mode.parse(mode);
        }
    }

    @Getter
    @Setter
    public static class Kakao {
        private String mode = "mock";
        private String baseUrl = "https://dapi.kakao.com";
        private String restApiKey = "";

        public Mode resolvedMode() {
            return Mode.parse(mode);
        }
    }

    @Getter
    @Setter
    public static class ChannelTalk {
        private String mode = "off";
        private String pluginKey = "";

        public Mode resolvedMode() {
            return Mode.parse(mode);
        }
    }
}
