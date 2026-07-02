package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

/**
 * 푸시 알림 발송 추상화. FCM live / mock / off 세 모드 지원.
 */
public interface PushNotifier {

    /**
     * 단일 토큰 발송. 실패해도 예외를 던지지 않고 결과만 반환.
     */
    SendResult sendToToken(String token, PushMessage message);

    /**
     * 다중 토큰 발송 (멀티캐스트). 부분 성공/실패는 SendResult 안에서 처리.
     */
    SendResult sendToTokens(Iterable<String> tokens, PushMessage message);

    @Getter
    @Builder
    class PushMessage {
        private final String title;
        private final String body;
        /** click_action / 딥링크용 path */
        private final String deepLink;
        /** 추가 데이터 (FE 분석/라우팅용) */
        private final Map<String, String> data;
    }

    @Getter
    @AllArgsConstructor
    class SendResult {
        private final boolean success;
        private final int successCount;
        private final int failureCount;
        private final String detail;
        public static SendResult ok() { return new SendResult(true, 1, 0, "ok"); }
        public static SendResult multi(int s, int f) {
            return new SendResult(f == 0, s, f, "sent");
        }
        public static SendResult fail(String d) { return new SendResult(false, 0, 1, d); }
    }
}
