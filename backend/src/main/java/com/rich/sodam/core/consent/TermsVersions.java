package com.rich.sodam.core.consent;

import com.rich.sodam.domain.type.TermsType;

import java.util.EnumMap;
import java.util.Map;

/**
 * 약관 <b>버전 식별자</b> 관리 (약관 버전관리 결함 해소).
 *
 * <p>동의 시점에 "어느 버전에 동의했는지"를 이력으로 남기기 위한 버전 ID만 보관한다.
 * 약관 본문(법률 문구)은 별도(변호사 승인·문서/스토리지)로 관리하며 본 코드는 다루지 않는다.
 * 약관 개정 시 해당 버전 문자열만 올리면(예: "tos-v1.1") 재동의 필요 판정에 활용할 수 있다.</p>
 */
public final class TermsVersions {

    private TermsVersions() {
    }

    private static final Map<TermsType, String> CURRENT = new EnumMap<>(TermsType.class);

    static {
        CURRENT.put(TermsType.TERMS_OF_SERVICE, "tos-v1.0");
        CURRENT.put(TermsType.PRIVACY_POLICY, "privacy-v1.0");
        CURRENT.put(TermsType.AGE_14, "age14-v1.0");
        CURRENT.put(TermsType.LOCATION_INFO, "location-v1.0");
        CURRENT.put(TermsType.MARKETING, "marketing-v1.0");
    }

    /** 해당 약관의 현행 버전 식별자. */
    public static String current(TermsType type) {
        return CURRENT.getOrDefault(type, "unknown");
    }
}
