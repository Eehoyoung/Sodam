package com.rich.sodam.config.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * PII 컬럼(휴대폰 번호 등) AES/GCM 양방향 암호화 JPA 컨버터 (PIPA §29).
 *
 * 동작 원칙:
 *  - 키가 설정돼 있으면: 저장 시 암호화(AES-256-GCM), 조회 시 복호화.
 *  - 키가 없으면(dev/test): 평문 그대로 저장/조회 — 부팅 실패시키지 않음.
 *
 * <p><b>무중단 전환(기존 평문 ↔ 암호문) 폴백</b>:
 * 운영 적용 시 기존 행은 평문 상태다. 복호화에 실패하면(즉 암호문이 아니면)
 * 값을 평문으로 간주해 그대로 반환한다. 이로써 키를 켠 직후에도 기존 평문 행이
 * 깨지지 않고, 이후 해당 행이 다시 저장될 때 암호문으로 전환된다.
 * <br><b>한계</b>: 이 폴백은 "복호화 실패 == 평문"이라는 가정에 의존하므로,
 * 암호문 prefix({@link #CIPHER_PREFIX})로 암호문 여부를 1차 판별해 오탐을 줄인다.
 * 완전한 일괄 전환은 별도 백필 배치(미구현, TODO)로 처리해야 한다.
 *
 * <p><b>키 주입</b>: {@link PiiCryptoKeyHolder} 가 부팅 시 static 키를 채운다.
 * AttributeConverter 는 Hibernate 가 인스턴스화하므로 Spring DI 대신 static 홀더 사용.
 */
@Converter
public class StringCryptoConverter implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(StringCryptoConverter.class);

    /** 암호문 식별 prefix — 평문/암호문 구분 및 폴백 오탐 방지. */
    static final String CIPHER_PREFIX = "enc:v1:";

    private static final String AES = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int GCM_IV_BYTES = 12;

    private static final SecureRandom RANDOM = new SecureRandom();

    /** null = 암호화 비활성(평문 유지). PiiCryptoKeyHolder 가 설정. */
    private static volatile SecretKey key;

    static void setKey(SecretKey newKey) {
        key = newKey;
    }

    static boolean isEncryptionEnabled() {
        return key != null;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        SecretKey k = key;
        if (k == null) {
            // 키 미설정 — 평문 저장 (dev/test 폴백)
            return attribute;
        }
        // 이미 암호문이면 이중 암호화 방지
        if (attribute.startsWith(CIPHER_PREFIX)) {
            return attribute;
        }
        try {
            byte[] iv = new byte[GCM_IV_BYTES];
            RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, k, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            // [iv || cipherText] 를 Base64 로 직렬화
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return CIPHER_PREFIX + Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            // 암호화 실패 시 데이터 유실 방지를 위해 평문 저장하지 않고 예외 전파.
            // (저장 단계 실패는 트랜잭션 롤백이 안전 — 평문 누출보다 낫다.)
            log.error("PII 암호화 실패 — 저장 중단. cause={}", e.getMessage());
            throw new IllegalStateException("PII 암호화에 실패했습니다.", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // 암호문 prefix 가 없으면 기존 평문 데이터 — 그대로 반환 (무중단 전환 폴백)
        if (!dbData.startsWith(CIPHER_PREFIX)) {
            return dbData;
        }
        SecretKey k = key;
        if (k == null) {
            // 키가 비활성인데 DB 에 암호문이 있는 비정상 상황 — 원문 복원 불가.
            // 평문으로 강제 노출하지 않고 암호문 그대로 반환(가독 불가) + 경고.
            log.warn("PII 복호화 키 미설정인데 암호문 컬럼 발견 — 키 설정 필요");
            return dbData;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(dbData.substring(CIPHER_PREFIX.length()));
            if (combined.length <= GCM_IV_BYTES) {
                log.warn("PII 암호문 길이 비정상 — 평문 간주");
                return dbData;
            }
            byte[] iv = new byte[GCM_IV_BYTES];
            byte[] cipherText = new byte[combined.length - GCM_IV_BYTES];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_BYTES);
            System.arraycopy(combined, GCM_IV_BYTES, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, k, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] plain = cipher.doFinal(cipherText);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 복호화 실패 == 키 불일치/손상. 평문으로 간주해 그대로 반환(무중단 폴백).
            // ⚠️ 키 로테이션 시 구 키로 암호화된 값이 깨질 수 있음 — 백필 배치 필요(TODO).
            log.warn("PII 복호화 실패 — 평문 간주 폴백. cause={}", e.getMessage());
            return dbData;
        }
    }

    /** AES 키 바이트로 SecretKey 생성 (16/24/32 byte = AES-128/192/256). */
    static SecretKey buildKey(byte[] keyBytes) {
        return new SecretKeySpec(keyBytes, AES);
    }
}
