package com.rich.sodam.config.crypto;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/**
 * PII 암호화 키 부트스트랩.
 *
 * <p>{@code sodam.security.pii.encryption-key} 환경설정에서 키를 읽어
 * {@link StringCryptoConverter} 의 static 키 슬롯에 채운다.
 * AttributeConverter 는 Hibernate 가 직접 인스턴스화하므로 Spring DI 가 불가능 →
 * 부팅 시 1회 static 주입 방식 사용.
 *
 * <p><b>키 형식</b>:
 *  <ul>
 *    <li>Base64 인코딩된 16/24/32 byte → 그대로 AES 키로 사용 (권장: 32 byte = AES-256)</li>
 *    <li>그 외 임의 문자열 → SHA-256 해시로 32 byte AES-256 키 파생 (운영 편의 폴백)</li>
 *  </ul>
 *
 * <p><b>키 미설정(dev/test) 폴백</b>: 값이 비어 있으면 키를 주입하지 않는다.
 * 이때 컨버터는 평문 저장/조회로 동작해 키 없는 환경이 깨지지 않는다.
 */
@Component
public class PiiCryptoKeyHolder {

    private static final Logger log = LoggerFactory.getLogger(PiiCryptoKeyHolder.class);

    @Value("${sodam.security.pii.encryption-key:}")
    private String encryptionKey;

    @PostConstruct
    void init() {
        if (encryptionKey == null || encryptionKey.isBlank()) {
            log.warn("PII 암호화 키 미설정 — 평문 모드로 동작합니다 (dev/test 허용, 운영 금지).");
            return;
        }
        try {
            byte[] keyBytes = resolveKeyBytes(encryptionKey.trim());
            SecretKey key = StringCryptoConverter.buildKey(keyBytes);
            StringCryptoConverter.setKey(key);
            log.info("PII 암호화 활성화 (AES-{}bit).", keyBytes.length * 8);
        } catch (Exception e) {
            // 키 파싱 실패해도 부팅은 막지 않고 평문 모드로 폴백 — 가용성 우선.
            // (운영에서는 키 검증 실패를 헬스체크/알람으로 잡아야 함 — TODO 운영.)
            log.error("PII 암호화 키 파싱 실패 — 평문 모드로 폴백. cause={}", e.getMessage());
        }
    }

    private byte[] resolveKeyBytes(String raw) {
        // Base64 로 디코딩 시도 → 길이가 AES 규격(16/24/32)이면 그대로 사용
        try {
            byte[] decoded = Base64.getDecoder().decode(raw);
            if (decoded.length == 16 || decoded.length == 24 || decoded.length == 32) {
                return decoded;
            }
        } catch (IllegalArgumentException ignored) {
            // Base64 가 아니면 아래 SHA-256 파생으로 진행
        }
        // 임의 문자열 → SHA-256(32 byte) 파생
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            return sha256.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("AES 키 파생 실패", e);
        }
    }
}
