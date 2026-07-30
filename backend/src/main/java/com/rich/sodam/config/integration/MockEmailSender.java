package com.rich.sodam.config.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * mock 이메일 발송기 — 실제 전송 없이 로그만 남긴다 (에뮬레이터/CI/dev).
 * 발송 횟수 카운터는 테스트 검증용.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "sodam.integration.mail", name = "mode",
        havingValue = "mock", matchIfMissing = true)
public class MockEmailSender implements EmailSender {

    private final AtomicInteger sentCount = new AtomicInteger();

    @Override
    public void sendPasswordResetCode(String to, String code) {
        sentCount.incrementAndGet();
        // OTP is a bearer secret. Test delivery without ever recording it or the message body.
        log.info("[MOCK Email] password reset message simulated to={}", EmailSender.maskEmail(to));
    }

    @Override
    public void sendWelcome(String to, String name) {
        sentCount.incrementAndGet();
        log.info("[MOCK Email] welcome message simulated to={}", EmailSender.maskEmail(to));
    }

    @Override
    public SendResult sendWithAttachments(String to, String subject, String body, List<Attachment> attachments) {
        sentCount.incrementAndGet();
        int totalBytes = attachments == null ? 0
                : attachments.stream().mapToInt(a -> a.content() == null ? 0 : a.content().length).sum();
        log.info("[MOCK Email] attachment message simulated to={} attachments={} totalBytes={}",
                EmailSender.maskEmail(to),
                attachments == null ? 0 : attachments.size(), totalBytes);
        return SendResult.ok();
    }

    public int getSentCount() {
        return sentCount.get();
    }
}
