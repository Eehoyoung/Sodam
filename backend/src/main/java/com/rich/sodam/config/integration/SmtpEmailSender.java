package com.rich.sodam.config.integration;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;

/**
 * live SMTP 이메일 발송기.
 *
 * 활성화 조건: sodam.integration.mail.mode=live + host/username/password/from 설정.
 * (LiveTossBillingClient 와 동일하게 @PostConstruct 에서 필수 설정 검증 — 빈 값이면 부팅 실패)
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "sodam.integration.mail", name = "mode", havingValue = "live")
public class SmtpEmailSender implements EmailSender {

    private final IntegrationProperties integrationProperties;

    private JavaMailSenderImpl mailSender;

    @PostConstruct
    void init() {
        IntegrationProperties.Mail mail = integrationProperties.getMail();
        if (isBlank(mail.getHost()) || isBlank(mail.getFrom())) {
            throw new IllegalStateException(
                    "mail mode=live 인데 SMTP 설정이 비어 있습니다. "
                            + "SODAM_MAIL_HOST / SODAM_MAIL_FROM (필요 시 USERNAME/PASSWORD) 을 설정하세요.");
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(mail.getHost());
        sender.setPort(mail.getPort());
        sender.setUsername(mail.getUsername());
        sender.setPassword(mail.getPassword());
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(!isBlank(mail.getUsername())));
        props.put("mail.smtp.starttls.enable", String.valueOf(mail.isStarttls()));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        this.mailSender = sender;
        log.info("SMTP EmailSender 활성화 — host={} port={}", mail.getHost(), mail.getPort());
    }

    @Override
    public void sendPasswordResetCode(String to, String code) {
        SendResult result = sendText(to, "[소담] 비밀번호 재설정 인증번호",
                "인증번호 " + code + " 를 입력해 비밀번호를 재설정해 주세요. 5분간 유효합니다.");
        if (!result.isSuccess()) {
            log.error("비밀번호 재설정 메일 발송 실패 to={} detail={}", EmailSender.maskEmail(to), result.getDetail());
        }
    }

    @Override
    public void sendWelcome(String to, String name) {
        SendResult result = sendText(to, "[소담] 소담에 오신 걸 환영해요",
                name + "님, 소담 가입을 환영합니다. 매장 출퇴근·급여 관리를 시작해 보세요.");
        if (!result.isSuccess()) {
            log.error("환영 메일 발송 실패 to={} detail={}", EmailSender.maskEmail(to), result.getDetail());
        }
    }

    @Override
    public SendResult sendWithAttachments(String to, String subject, String body, List<Attachment> attachments) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(integrationProperties.getMail().getFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            if (attachments != null) {
                for (Attachment attachment : attachments) {
                    helper.addAttachment(attachment.filename(),
                            new ByteArrayResource(attachment.content()), attachment.contentType());
                }
            }
            mailSender.send(message);
            return SendResult.ok();
        } catch (Exception e) {
            log.error("첨부 메일 발송 실패 to={} subject={}", EmailSender.maskEmail(to), subject, e);
            return SendResult.fail(e.getMessage());
        }
    }

    private SendResult sendText(String to, String subject, String body) {
        return sendWithAttachments(to, subject, body, List.of());
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
