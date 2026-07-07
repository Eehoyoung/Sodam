package com.rich.sodam.config.crypto;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

/**
 * PII 블라인드 인덱스(§2.6) 페퍼 부트스트랩 — {@link PiiCryptoKeyHolder}와 동일한 static 주입 패턴.
 *
 * <p>암호화 컬럼(예: {@code business_number})은 GCM 비결정성 때문에 동등검색이 불가능하므로,
 * 옆에 붙는 {@code *_search_hash} 컬럼의 HMAC 키(페퍼)를 여기서 주입한다. 이 페퍼는
 * {@code sodam.security.pii.encryption-key}와 독립된 별도 시크릿이어야 한다(키 분리).
 *
 * <p><b>dev/test 폴백</b>: 값이 비어 있으면 고정된 개발 전용 페퍼로 대체해 해시 계산 자체는
 * 항상 가능하게 한다(암호화 키와 달리, 검색 해시는 유니크 제약의 근거이므로 "비활성" 상태를
 * 허용할 수 없음). 운영에서는 미설정 시 부팅을 거부한다(fail-fast).
 */
@Component
public class PiiSearchHashKeyHolder {

    private static final Logger log = LoggerFactory.getLogger(PiiSearchHashKeyHolder.class);

    @Value("${sodam.security.pii.search-pepper:}")
    private String searchPepper;

    private final Environment environment;

    public PiiSearchHashKeyHolder(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void init() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");

        if (searchPepper == null || searchPepper.isBlank()) {
            if (isProd) {
                throw new IllegalStateException(
                        "운영 환경에서 PII 검색 페퍼(sodam.security.pii.search-pepper)가 미설정입니다. " +
                                "SODAM_PII_SEARCH_PEPPER 를 주입한 뒤 기동하세요.");
            }
            log.warn("PII 검색 페퍼 미설정 — 개발 전용 고정 페퍼로 대체합니다 (dev/test 허용, 운영 금지).");
            PiiSearchHashSupport.setCurrentPepper(
                    resolveKeyBytes(PiiSearchHashSupport.DEV_FALLBACK_PEPPER), 1);
            return;
        }

        PiiSearchHashSupport.setCurrentPepper(resolveKeyBytes(searchPepper.trim()), 1);
        log.info("PII 검색 블라인드 인덱스 활성화.");
    }

    private byte[] resolveKeyBytes(String raw) {
        try {
            byte[] decoded = Base64.getDecoder().decode(raw);
            if (decoded.length >= 16) {
                return decoded;
            }
        } catch (IllegalArgumentException ignored) {
            // Base64 가 아니면 아래 SHA-256 파생으로 진행
        }
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            return sha256.digest(raw.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("PII 검색 페퍼 파생 실패", e);
        }
    }
}
