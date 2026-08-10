package com.rich.sodam.service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.UUID;

/** 추천 코드 형식과 레거시 코드 이관 알고리즘을 한곳에 둔다. */
final class ReferralCodeGenerator {

    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int LENGTH = 8;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private ReferralCodeGenerator() {
    }

    static String randomCode() {
        StringBuilder builder = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            builder.append(ALPHABET.charAt(SECURE_RANDOM.nextInt(ALPHABET.length())));
        }
        return builder.toString();
    }

    /** V81 이전에 발급된 결정적 코드를 보존하기 위한 일회성 이관용 알고리즘. */
    static String legacyCodeForUserId(Long userId) {
        String seed = "SODAM-REF-V1-" + userId;
        String hash = UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString()
                .replace("-", "").toUpperCase(Locale.ROOT);
        return "S" + hash.substring(0, 7);
    }
}
