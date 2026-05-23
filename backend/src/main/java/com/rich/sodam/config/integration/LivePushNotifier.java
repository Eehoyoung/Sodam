package com.rich.sodam.config.integration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Firebase Admin SDK 기반 FCM 발송기 (live 모드).
 * 동작 조건: {@code sodam.integration.fcm.mode=live}
 *
 * 서비스 계정 JSON 경로: {@code sodam.integration.fcm.credentials-path}
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "sodam.integration.fcm", name = "mode", havingValue = "live")
public class LivePushNotifier implements PushNotifier {

    private final IntegrationProperties props;
    private FirebaseMessaging messaging;

    @PostConstruct
    void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credentials = GoogleCredentials.fromStream(
                        new FileInputStream(props.getFcm().getCredentialsPath()));
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .setProjectId(props.getFcm().getProjectId())
                        .build();
                FirebaseApp.initializeApp(options);
            }
            messaging = FirebaseMessaging.getInstance();
            log.info("FCM Live initialized projectId={}", props.getFcm().getProjectId());
        } catch (Exception e) {
            log.error("FCM 초기화 실패", e);
            throw new IllegalStateException("FCM 초기화 실패", e);
        }
    }

    @Override
    public SendResult sendToToken(String token, PushMessage message) {
        try {
            Message m = buildMessage(message).setToken(token).build();
            String id = messaging.send(m);
            log.debug("FCM sent id={}", id);
            return SendResult.ok();
        } catch (FirebaseMessagingException e) {
            log.warn("FCM send 실패 token={} reason={}", shorten(token), e.getMessagingErrorCode());
            return SendResult.fail(e.getMessagingErrorCode() != null ? e.getMessagingErrorCode().name() : e.getMessage());
        } catch (Exception e) {
            log.error("FCM send 오류", e);
            return SendResult.fail(e.getClass().getSimpleName());
        }
    }

    @Override
    public SendResult sendToTokens(Iterable<String> tokens, PushMessage message) {
        List<String> tokenList = new ArrayList<>();
        tokens.forEach(tokenList::add);
        if (tokenList.isEmpty()) return SendResult.multi(0, 0);
        try {
            MulticastMessage m = MulticastMessage.builder()
                    .addAllTokens(tokenList)
                    .setNotification(Notification.builder()
                            .setTitle(message.getTitle())
                            .setBody(message.getBody())
                            .build())
                    .putAllData(safeData(message))
                    .build();
            BatchResponse res = messaging.sendEachForMulticast(m);
            return SendResult.multi(res.getSuccessCount(), res.getFailureCount());
        } catch (Exception e) {
            log.error("FCM multicast 오류", e);
            return SendResult.fail(e.getClass().getSimpleName());
        }
    }

    private Message.Builder buildMessage(PushMessage message) {
        Message.Builder b = Message.builder()
                .setNotification(Notification.builder()
                        .setTitle(message.getTitle())
                        .setBody(message.getBody())
                        .build())
                .putAllData(safeData(message));
        return b;
    }

    private Map<String, String> safeData(PushMessage message) {
        Map<String, String> data = new java.util.HashMap<>();
        if (message.getData() != null) data.putAll(message.getData());
        if (message.getDeepLink() != null) data.put("deepLink", message.getDeepLink());
        return data;
    }

    private String shorten(String t) {
        if (t == null) return "null";
        return t.length() > 16 ? t.substring(0, 16) + "..." : t;
    }
}
