package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 직원 서류 종류 (A5/M-NEW-01). 보건증 등 만료 관리 대상 포함.
 *
 * <p>원본 PII는 저장하지 않는다 — 참조키(fileRef)·만료 메타만 보관.
 */
@Getter
public enum DocumentType {
    HEALTH_CERTIFICATE("보건증", true),
    LABOR_CONTRACT("근로계약서", false),
    BANKBOOK("통장사본", false),
    ID_CARD("신분증", false),
    /** 연소근로자(만 18세 미만) §66 — 친권자(후견인) 동의서 보유 여부 체크리스트용(WP-5). */
    GUARDIAN_CONSENT("친권자 동의서", false),
    /** 연소근로자 §66 — 가족관계증명서 보유 여부 체크리스트용(WP-5). */
    FAMILY_RELATION_CERTIFICATE("가족관계증명서", false),
    /** 만 15세 미만 취직인허증(§64) — 요건 충족 여부를 앱이 자동 판정하지 않고 체크리스트로만 노출(G-17). */
    WORK_PERMIT("취직인허증", false),
    ETC("기타", false);

    private final String label;
    /** 만료 관리(갱신 경보) 대상 여부. 보건증 등 갱신 의무 서류. */
    private final boolean expiryTracked;

    DocumentType(String label, boolean expiryTracked) {
        this.label = label;
        this.expiryTracked = expiryTracked;
    }
}
