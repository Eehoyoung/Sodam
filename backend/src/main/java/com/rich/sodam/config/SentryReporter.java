package com.rich.sodam.config;

import io.sentry.Sentry;
import io.sentry.SentryLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Sentry 캡처 진입점(가드 포함). 키 미설정으로 Sentry 가 비활성이어도 NPE/크래시 없이 no-op 한다.
 *
 * <p>핵심 3이벤트(RBAC 우회·NFC 반복실패·결제 실패)를 일관된 태깅으로 캡처한다.
 * 실제 DSN 주입·활성화는 {@link SentryConfig}(환경변수)에서 처리하며, 여기서는 캡처만 책임진다.
 */
@Slf4j
@Component
public class SentryReporter {

    /** 보안 알람 카테고리 태그 키. Sentry 대시보드에서 알람 라우팅에 사용. */
    public static final String TAG_ALERT = "sodam.alert";

    public static final String ALERT_RBAC_BYPASS = "rbac_bypass";
    public static final String ALERT_NFC_REPEATED_FAILURE = "nfc_repeated_failure";
    public static final String ALERT_PAYMENT_FAILURE = "payment_failure";

    /**
     * 예외를 Sentry 로 캡처한다. 비활성 시 no-op.
     *
     * @param alert 알람 카테고리(태그)
     * @param e     캡처할 예외
     * @param tags  추가 컨텍스트 태그(PII 미포함 — 식별정보 금지)
     */
    public void captureException(String alert, Throwable e, Map<String, String> tags) {
        if (!Sentry.isEnabled()) {
            return; // 키 미설정/비활성 — 조용히 무시(크래시 방지)
        }
        try {
            Sentry.withScope(scope -> {
                scope.setTag(TAG_ALERT, alert);
                if (tags != null) {
                    tags.forEach(scope::setTag);
                }
                Sentry.captureException(e);
            });
        } catch (Exception ex) {
            // Sentry 자체 오류가 비즈니스 흐름을 깨면 안 됨.
            log.debug("Sentry 캡처 실패(무시): {}", ex.getMessage());
        }
    }

    /**
     * 메시지를 Sentry 로 캡처한다(예외 객체가 없는 이벤트용). 비활성 시 no-op.
     */
    public void captureMessage(String alert, String message, Map<String, String> tags) {
        if (!Sentry.isEnabled()) {
            return;
        }
        try {
            Sentry.withScope(scope -> {
                scope.setLevel(SentryLevel.WARNING);
                scope.setTag(TAG_ALERT, alert);
                if (tags != null) {
                    tags.forEach(scope::setTag);
                }
                Sentry.captureMessage(message);
            });
        } catch (Exception ex) {
            log.debug("Sentry 캡처 실패(무시): {}", ex.getMessage());
        }
    }
}
