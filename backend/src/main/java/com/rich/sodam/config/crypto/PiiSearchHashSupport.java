package com.rich.sodam.config.crypto;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * PII 블라인드 인덱스(HMAC-SHA256) 계산 유틸 (PIPA §29, DB_OPTIMIZATION_PLAN.md §2.6).
 *
 * <p>{@link StringCryptoConverter}(AES-GCM)는 같은 평문도 매번 다른 암호문을 내므로
 * {@code WHERE column = ?} 동등검색이 불가능하다. 이 클래스는 그 옆에 붙는 검색 전용
 * 컬럼(예: {@code business_number_search_hash})의 값을 계산한다 — 결정론적이지만
 * 일방향(비가역)인 HMAC이라 인덱스·유니크 제약을 걸어도 평문이 복원되지 않는다.
 *
 * <p><b>키 주입</b>: {@code StringCryptoConverter}와 동일하게 Hibernate가 아니라
 * 도메인 엔티티 생성자에서 직접 호출하므로, Spring DI 대신 static 홀더를 쓴다
 * ({@link PiiSearchHashKeyHolder}가 부팅 시 1회 주입).
 *
 * <p><b>키 분리</b>: {@code SODAM_PII_ENCRYPTION_KEY}(암호화 키)와는 독립된 별도 시크릿
 * ({@code SODAM_PII_SEARCH_PEPPER})을 사용한다 — 하나가 유출돼도 다른 하나로 피해가
 * 전이되지 않도록 하기 위함.
 */
public final class PiiSearchHashSupport {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    /** 현재 페퍼 미설정 시 사용하는 개발 전용 고정값 — 운영에서는 부팅 시 fail-fast로 대체되어 도달하지 않음. */
    static final String DEV_FALLBACK_PEPPER = "sodam-dev-insecure-search-pepper-do-not-use-in-prod";

    /**
     * 정적 기본값으로 즉시 초기화한다(Spring 컨텍스트 없이 {@code new Store(...)}를 직접 생성하는
     * 순수 단위테스트 다수가 존재 — {@link PiiSearchHashKeyHolder} 부팅 전에도 해시 계산이 절대
     * 예외를 던지지 않아야 한다). 실제 운영 부팅 시 {@link PiiSearchHashKeyHolder}가 실제 페퍼로 덮어쓴다.
     */
    private static volatile byte[] currentPepper = deriveDefault(DEV_FALLBACK_PEPPER);
    private static volatile int currentVersion = 1;

    private PiiSearchHashSupport() {
    }

    static void setCurrentPepper(byte[] pepper, int version) {
        currentPepper = pepper;
        currentVersion = version;
    }

    private static byte[] deriveDefault(String raw) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static int currentVersion() {
        return currentVersion;
    }

    /**
     * 사업자등록번호 검색 해시. 숫자 이외 문자(하이픈 등)를 제거해 정규화한 뒤 HMAC을 계산한다 —
     * 입력 형태가 "123-45-67890"이든 "1234567890"이든 같은 해시가 나와야 동등검색이 성립한다.
     */
    public static String hashBusinessNumber(String rawBusinessNumber) {
        if (rawBusinessNumber == null) {
            return null;
        }
        return hmacHex("bizno", rawBusinessNumber.replaceAll("\\D", ""));
    }

    /**
     * 휴대폰 번호 검색 해시(§2.6). 숫자만 정규화 후 HMAC — business number와 같은 페퍼를 쓰지만
     * "bizno:"/"phone:" 컨텍스트 프리픽스로 네임스페이스를 분리해, 우연히 같은 숫자열이어도
     * (예: "1234567890") 필드 종류가 다르면 다른 해시가 나오게 한다.
     */
    public static String hashPhone(String rawPhone) {
        if (rawPhone == null) {
            return null;
        }
        return hmacHex("phone", rawPhone.replaceAll("\\D", ""));
    }

    private static String hmacHex(String context, String normalizedInput) {
        byte[] pepper = currentPepper;
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(pepper, HMAC_ALGORITHM));
            byte[] digest = mac.doFinal((context + ":" + normalizedInput).getBytes(StandardCharsets.UTF_8));
            return toHex(digest);
        } catch (NoSuchAlgorithmException | java.security.InvalidKeyException e) {
            throw new IllegalStateException("PII 검색 해시 계산에 실패했습니다.", e);
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
