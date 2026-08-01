package com.rich.sodam.config.crypto;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

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
 *    <li>dev/test의 그 외 임의 문자열 → SHA-256 해시로 32 byte AES-256 키 파생</li>
 *  </ul>
 * 운영(prod)은 예측 가능한 문자열·형식 오류로 인한 약한 키 설정을 막기 위해
 * 반드시 32 byte Base64 AES-256 키만 허용하고, 그 외 설정이면 기동을 거부한다.
 *
 * <p><b>키 미설정(dev/test) 폴백</b>: 값이 비어 있으면 키를 주입하지 않는다.
 * 이때 컨버터는 평문 저장/조회로 동작해 키 없는 환경이 깨지지 않는다.
 */
@Component
public class PiiCryptoKeyHolder {

    private static final Logger log = LoggerFactory.getLogger(PiiCryptoKeyHolder.class);

    @Value("${sodam.security.pii.encryption-key:}")
    private String encryptionKey;

    private final Environment environment;

    public PiiCryptoKeyHolder(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void init() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (encryptionKey == null || encryptionKey.isBlank()) {
            // 운영(prod) 프로파일에서는 평문 PII 저장을 차단 — 키 없이는 부팅 거부(fail-fast, PIPA §29).
            if (isProd) {
                throw new IllegalStateException(
                        "운영 환경에서 PII 암호화 키(sodam.security.pii.encryption-key)가 미설정입니다. " +
                                "평문 PII 저장 금지 — SODAM_PII_KEY 를 주입한 뒤 기동하세요.");
            }
            log.warn("PII 암호화 키 미설정 — 평문 모드로 동작합니다 (dev/test 허용, 운영 금지).");
            return;
        }
        try {
            byte[] keyBytes = resolveKeyBytes(encryptionKey.trim(), isProd);
            SecretKey key = StringCryptoConverter.buildKey(keyBytes);
            StringCryptoConverter.setKey(key);
            log.info("PII 암호화 활성화 (AES-{}bit).", keyBytes.length * 8);
        } catch (Exception e) {
            StringCryptoConverter.setKey(null);
            if (isProd) {
                throw new IllegalStateException(
                        "운영 환경의 PII 암호화 키는 32바이트 Base64 AES-256 키여야 합니다.", e);
            }
            log.error("PII 암호화 키 파싱 실패 — 개발/테스트 평문 모드로 폴백. cause={}", e.getMessage());
        }
    }

    private byte[] resolveKeyBytes(String raw, boolean requireProductionAes256Key) {
        // Base64 로 디코딩 시도 → 길이가 AES 규격(16/24/32)이면 그대로 사용
        try {
            byte[] decoded = Base64.getDecoder().decode(raw);
            if (decoded.length == 16 || decoded.length == 24 || decoded.length == 32) {
                if (requireProductionAes256Key && decoded.length != 32) {
                    throw new IllegalArgumentException("운영 PII 암호화 키는 32바이트여야 합니다.");
                }
                return decoded;
            }
        } catch (IllegalArgumentException ignored) {
            if (requireProductionAes256Key) {
                throw new IllegalArgumentException("운영 PII 암호화 키는 32바이트 Base64 값이어야 합니다.", ignored);
            }
            // dev/test는 아래 SHA-256 파생으로 진행
        }
        if (requireProductionAes256Key) {
            throw new IllegalArgumentException("운영 PII 암호화 키는 32바이트 Base64 값이어야 합니다.");
        }
        // dev/test의 임의 문자열 → SHA-256(32 byte) 파생
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            return sha256.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("AES 키 파생 실패", e);
        }
    }
}
