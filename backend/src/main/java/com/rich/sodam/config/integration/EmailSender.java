package com.rich.sodam.config.integration;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * 이메일 발송 추상화. mock(stdout 로그) / live(SMTP) 두 모드 지원.
 * 모드는 sodam.integration.mail.mode (SODAM_INTEGRATION_MAIL_MODE) 로 전환.
 */
public interface EmailSender {

    void sendPasswordResetCode(String to, String code);

    void sendWelcome(String to, String name);

    /**
     * 첨부파일 포함 발송 (세무사 인건비 내역서 송부 등).
     * 실패해도 예외를 던지지 않고 결과만 반환 — 호출부에서 발송 이력에 상태 기록.
     */
    SendResult sendWithAttachments(String to, String subject, String body, List<Attachment> attachments);

    record Attachment(String filename, String contentType, byte[] content) {
    }

    @Getter
    @AllArgsConstructor
    class SendResult {
        private final boolean success;
        private final String detail;

        public static SendResult ok() {
            return new SendResult(true, "ok");
        }

        public static SendResult fail(String detail) {
            return new SendResult(false, detail);
        }
    }

    /** 로그용 이메일 마스킹 (PII 로그 금지 규칙). */
    static String maskEmail(String email) {
        if (email == null) return "(null)";
        int at = email.indexOf('@');
        if (at <= 1) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }
}
