package com.rich.sodam.service;

import com.rich.sodam.config.integration.EmailSender;
import com.rich.sodam.domain.PasswordResetToken;
import com.rich.sodam.domain.User;
import com.rich.sodam.repository.PasswordResetTokenRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * 비밀번호 재설정 OTP 흐름.
 *
 * 3단계:
 *  1) request(email)   → 6자리 OTP 생성 + 이메일 발송, DB에는 SHA-256 해시만 저장
 *  2) verify(email, code) → 해시 비교, 성공 시 resetTicket 반환 (CSRF 형태)
 *  3) confirm(resetTicket, newPassword) → BCrypt 해시 후 User.password 갱신, 토큰 used
 *
 * 보안:
 *  - OTP 5분 만료, 1회 사용
 *  - 이메일당 새 발급 시 이전 토큰 무효화
 *  - 존재하지 않는 이메일이어도 응답 동일 (계정 enumeration 방지)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final int OTP_VALID_MINUTES = 5;
    private static final String HASH_SALT = "sodam-pwd-reset-salt-v1";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void requestReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        // 계정 존재 여부와 무관하게 동일 시간 응답
        if (userOpt.isEmpty()) {
            log.info("비밀번호 재설정 요청 — 존재하지 않는 이메일: {}", maskEmail(email));
            return;
        }

        // 이전 활성 토큰 무효화
        tokenRepository.invalidateAllForEmail(email);

        // 6자리 OTP 생성 (앞자리 0 허용)
        String code = String.format("%06d", random.nextInt(1_000_000));
        String codeHash = hash(code);
        PasswordResetToken token = PasswordResetToken.create(email, codeHash, OTP_VALID_MINUTES);
        tokenRepository.save(token);

        emailSender.sendPasswordResetCode(email, code);
    }

    /**
     * @return 검증 성공 시 일회용 resetTicket. 실패 시 null.
     */
    @Transactional
    public String verifyCode(String email, String code) {
        if (code == null || code.length() != 6) return null;
        String codeHash = hash(code);
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByCodeHashAndUsedFalse(codeHash);
        if (tokenOpt.isEmpty()) return null;
        PasswordResetToken token = tokenOpt.get();
        if (!token.getEmail().equalsIgnoreCase(email)) return null;
        if (token.isExpired()) return null;
        return token.getResetTicket();
    }

    @Transactional
    public boolean confirmReset(String resetTicket, String newPassword) {
        if (resetTicket == null || resetTicket.isBlank()) return false;
        if (!isValidPassword(newPassword)) return false;

        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByResetTicketAndUsedFalse(resetTicket);
        if (tokenOpt.isEmpty()) return false;
        PasswordResetToken token = tokenOpt.get();
        if (token.isExpired()) return false;

        Optional<User> userOpt = userRepository.findByEmail(token.getEmail());
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user); // 명시적 save (JPA dirty checking 보조 — 트랜잭션 경계 확실히)
        token.markUsed();
        log.info("비밀번호 재설정 완료 user={}", user.getId());
        return true;
    }

    /**
     * 정책: 8자 이상, 대소문자·숫자·특수문자 각 1자 이상.
     */
    public static boolean isValidPassword(String pw) {
        if (pw == null || pw.length() < 8 || pw.length() > 128) return false;
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (char c : pw.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private static String hash(String code) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] data = (HASH_SALT + ":" + code).getBytes(StandardCharsets.UTF_8);
            return Base64.getEncoder().encodeToString(md.digest(data));
        } catch (Exception e) {
            throw new RuntimeException("해시 실패", e);
        }
    }

    private static String maskEmail(String email) {
        if (email == null) return "(null)";
        int at = email.indexOf('@');
        if (at <= 1) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }
}
