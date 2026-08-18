package com.rich.sodam.service.ai;

import java.util.regex.Pattern;

/**
 * HC-8(LLM에 PII 전송 금지) 공용 패턴 — WP-1(정정 사유)에 있던 전화번호 패턴을 WP-3(지원 메시지)와
 * 공유하도록 추출(HC-6, 도메인마다 복제 금지).
 */
public final class PiiPatterns {

    public static final Pattern PHONE_LIKE = Pattern.compile("01\\d[-\\s]?\\d{3,4}[-\\s]?\\d{4}");

    private PiiPatterns() {
    }

    public static boolean containsPhoneLike(String text) {
        return text != null && PHONE_LIKE.matcher(text).find();
    }

    /** 전화번호로 보이는 부분을 replacement로 치환한 새 문자열을 반환한다(원본은 불변). */
    public static String maskPhoneLike(String text, String replacement) {
        return text == null ? null : PHONE_LIKE.matcher(text).replaceAll(replacement);
    }
}
