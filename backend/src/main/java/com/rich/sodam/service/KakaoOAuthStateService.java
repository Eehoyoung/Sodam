package com.rich.sodam.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/** Creates and consumes single-use OAuth state + PKCE verifier transactions. */
@Service
public class KakaoOAuthStateService {

    private static final Duration TRANSACTION_TTL = Duration.ofMinutes(5);
    private static final int STATE_BYTES = 32;
    private static final int VERIFIER_BYTES = 48;

    private final KakaoOAuthStateStore stateStore;
    private final SecureRandom random = new SecureRandom();

    public KakaoOAuthStateService(KakaoOAuthStateStore stateStore) {
        this.stateStore = stateStore;
    }

    public Authorization begin() {
        String state = randomUrlToken(STATE_BYTES);
        String codeVerifier = randomUrlToken(VERIFIER_BYTES);
        stateStore.save(state, sha256Base64Url(codeVerifier), TRANSACTION_TTL);
        return new Authorization(state, codeVerifier, sha256Base64Url(codeVerifier));
    }

    public boolean consume(String state, String codeVerifier) {
        if (!isExpectedUrlToken(state, STATE_BYTES) || !isExpectedUrlToken(codeVerifier, VERIFIER_BYTES)) {
            return false;
        }
        String storedDigest = stateStore.consume(state);
        if (storedDigest == null) {
            return false;
        }
        return MessageDigest.isEqual(
                storedDigest.getBytes(StandardCharsets.US_ASCII),
                sha256Base64Url(codeVerifier).getBytes(StandardCharsets.US_ASCII));
    }

    private String randomUrlToken(int byteCount) {
        byte[] bytes = new byte[byteCount];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean isExpectedUrlToken(String value, int byteCount) {
        int expectedLength = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[byteCount]).length();
        return value != null && value.length() == expectedLength && value.matches("[A-Za-z0-9_-]+");
    }

    private String sha256Base64Url(String value) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public record Authorization(String state, String codeVerifier, String codeChallenge) { }
}
