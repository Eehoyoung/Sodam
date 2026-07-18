package com.rich.sodam.core.electronicsignature;

import com.rich.sodam.config.integration.IntegrationProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/** 전자서명 receipt/object ref만을 위한 AES-256-GCM 및 HMAC 도메인. */
@Component
public class SensitiveReferenceCrypto {
    private static final byte[] DEV_AES = MessageDigestHolder.sha256("sodam-esign-dev-aes-v1");
    private static final byte[] DEV_HMAC = MessageDigestHolder.sha256("sodam-esign-dev-hmac-v1");
    private static final String PREFIX = "v1.k1.";
    private static final int IV_BYTES = 12;

    private final SecretKeySpec aesKey;
    private final SecretKeySpec hmacKey;
    private final SecureRandom random = new SecureRandom();

    public SensitiveReferenceCrypto(IntegrationProperties properties) {
        IntegrationProperties.ElectronicSignature c = properties.getElectronicSignature();
        boolean live = c.resolvedMode() == IntegrationProperties.Mode.LIVE;
        byte[] aes = decode(c.getRefEncryptionKey(), "ESIGN_REF_ENCRYPTION_KEY", live);
        byte[] hmac = decode(c.getRefHmacPepper(), "ESIGN_REF_HMAC_PEPPER", live);
        if (aes == null) aes = DEV_AES;
        if (hmac == null) hmac = DEV_HMAC;
        if (aes.length != 32 || hmac.length < 32) {
            throw new IllegalStateException("전자서명 ref 키는 AES 32byte, HMAC 32byte 이상이어야 합니다.");
        }
        this.aesKey = new SecretKeySpec(aes, "AES");
        this.hmacKey = new SecretKeySpec(hmac, "HmacSHA256");
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) throw new IllegalArgumentException("암호화할 ref가 비어 있습니다.");
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("전자서명 ref 암호화에 실패했습니다.", e);
        }
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null || !ciphertext.startsWith(PREFIX)) {
            throw new IllegalStateException("지원하지 않는 전자서명 ref 암호문입니다.");
        }
        try {
            byte[] combined = Base64.getUrlDecoder().decode(ciphertext.substring(PREFIX.length()));
            if (combined.length <= IV_BYTES) throw new IllegalArgumentException("암호문 길이 오류");
            byte[] iv = java.util.Arrays.copyOfRange(combined, 0, IV_BYTES);
            byte[] encrypted = java.util.Arrays.copyOfRange(combined, IV_BYTES, combined.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("전자서명 ref 복호화에 실패했습니다.", e);
        }
    }

    public String receiptHmac(ElectronicSignatureProvider provider, String receiptId) {
        if (provider == null || receiptId == null || receiptId.isBlank()) {
            throw new IllegalArgumentException("receipt HMAC 입력이 비어 있습니다.");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(hmacKey);
            byte[] digest = mac.doFinal(("esign-receipt:v1:" + provider.name() + ":" + receiptId)
                    .getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("전자서명 receipt HMAC 계산에 실패했습니다.", e);
        }
    }

    private static byte[] decode(String value, String name, boolean required) {
        if (value == null || value.isBlank()) {
            if (required) throw new IllegalStateException(name + " 설정이 필요합니다.");
            return null;
        }
        try {
            return Base64.getDecoder().decode(value.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(name + "는 Base64여야 합니다.", e);
        }
    }

    private static final class MessageDigestHolder {
        static byte[] sha256(String value) {
            try {
                return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                throw new ExceptionInInitializerError(e);
            }
        }
    }
}
