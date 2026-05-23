package com.rich.sodam.config.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 이메일 발송 추상화. 현재 mock(stdout) 만 구현.
 *
 * TODO[CONFIRM-C-?]: 운영 출시 직전 실제 메일 전송 구현 (AWS SES 또는 SMTP)
 *   - 활성화 조건: 사업자 도메인 확보 + DKIM/SPF 설정 완료
 *   - 권장: AWS SES (한국 리전) 또는 SendGrid 등 트랜잭셔널 메일 SaaS
 *   - 변경 위치: 본 클래스를 인터페이스로 분리하고 LiveEmailSender 추가
 */
@Slf4j
@Component
public class EmailSender {

    public void sendPasswordResetCode(String to, String code) {
        // TODO[CONFIRM-C-운영]: 실제 메일 발송 — 출시 직전 SES/SendGrid 연동 필요
        log.info("[MOCK Email] → to={} subject=\"소담 비밀번호 재설정\" code={}", maskEmail(to), code);
        log.info("[MOCK Email] body: \"인증번호 {} 를 입력해 비밀번호를 재설정해 주세요. 5분간 유효합니다.\"", code);
    }

    public void sendWelcome(String to, String name) {
        // TODO[CONFIRM-C-운영]: 실제 메일 발송
        log.info("[MOCK Email] → to={} subject=\"소담에 오신 걸 환영해요\" name={}", maskEmail(to), name);
    }

    private String maskEmail(String email) {
        if (email == null) return "(null)";
        int at = email.indexOf('@');
        if (at <= 1) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }
}
