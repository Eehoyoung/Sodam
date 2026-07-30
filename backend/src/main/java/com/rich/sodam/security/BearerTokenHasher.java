package com.rich.sodam.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;

/**
 * Produces a deterministic, keyed digest for short-lived bearer credentials stored in the database.
 * Raw credentials remain available only to the requesting client and are never persisted.
 */
@Component
public class BearerTokenHasher {

    private static final String ALGORITHM = "HmacSHA256";
    private final SecretKeySpec key;

    public BearerTokenHasher(@Value("${jwt.secret}") String jwtSecret) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("jwt.secret is required for bearer token hashing");
        }
        this.key = new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), ALGORITHM);
    }

    public String hash(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("token must not be blank");
        }
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(token.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to hash bearer token", e);
        }
    }
}
