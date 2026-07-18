package com.rich.sodam.core.electronicsignature;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;

/** 서명할 최종 문서의 SHA-256. 공급자에는 Base64 URL-safe/no-padding 값을 전달한다. */
public record DocumentDigest(String hex, String base64Url) {

    public DocumentDigest {
        if (hex == null || !hex.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("SHA-256 hex 값이 올바르지 않습니다.");
        }
        if (base64Url == null || !base64Url.matches("[A-Za-z0-9_-]{43}")) {
            throw new IllegalArgumentException("SHA-256 Base64 URL 값이 올바르지 않습니다.");
        }
    }

    public static DocumentDigest sha256(byte[] finalizedDocument) {
        if (finalizedDocument == null || finalizedDocument.length == 0) {
            throw new IllegalArgumentException("서명할 최종 문서가 비어 있습니다.");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(finalizedDocument);
            return new DocumentDigest(
                    HexFormat.of().formatHex(digest),
                    Base64.getUrlEncoder().withoutPadding().encodeToString(digest));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", e);
        }
    }

    public static DocumentDigest fromHex(String hex) {
        if (hex == null || !hex.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("SHA-256 hex 값이 올바르지 않습니다.");
        }
        byte[] digest = HexFormat.of().parseHex(hex);
        return new DocumentDigest(hex, Base64.getUrlEncoder().withoutPadding().encodeToString(digest));
    }
}
