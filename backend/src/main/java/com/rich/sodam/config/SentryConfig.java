package com.rich.sodam.config;

import com.rich.sodam.config.integration.IntegrationProperties;
import io.sentry.Sentry;
import io.sentry.SentryLevel;
import io.sentry.SentryOptions;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

/**
 * Sentry 동적 초기화.
 *
 * - sodam.integration.sentry.mode=live → Sentry 활성 (DSN 필요)
 * - off (또는 mock) → Sentry 비활성
 *
 * Spring Boot Starter 가 자동 설정 가능하지만, 본 프로젝트는 mode 플래그를 따르도록 수동 초기화한다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class SentryConfig {

    private final IntegrationProperties props;

    @PostConstruct
    void init() {
        IntegrationProperties.Sentry cfg = props.getSentry();
        if (cfg.resolvedMode() != IntegrationProperties.Mode.LIVE) {
            log.info("Sentry 비활성 (mode={})", cfg.getMode());
            return;
        }
        if (cfg.getDsn() == null || cfg.getDsn().isBlank()) {
            log.warn("Sentry mode=live 이지만 DSN 미설정 — 비활성으로 둠");
            return;
        }
        Sentry.init((SentryOptions options) -> {
            options.setDsn(cfg.getDsn());
            options.setEnvironment(cfg.getEnvironment());
            options.setTracesSampleRate(cfg.getTracesSampleRate());
            options.setDebug(false);
            options.setAttachStacktrace(true);
            options.setAttachThreads(true);
            options.setBeforeSend((event, hint) -> {
                // PII 보호: 이메일/전화 마스킹
                if (event.getUser() != null && event.getUser().getEmail() != null) {
                    event.getUser().setEmail(maskEmail(event.getUser().getEmail()));
                }
                return event;
            });
            options.setBeforeBreadcrumb((breadcrumb, hint) -> {
                // 쿼리스트링/헤더 마스킹은 추가 강화 가능
                return breadcrumb;
            });
        });
        Sentry.captureMessage("Sodam BE started", SentryLevel.INFO);
        log.info("Sentry 초기화 완료 env={} sampleRate={}", cfg.getEnvironment(), cfg.getTracesSampleRate());
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }
}
