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
    ETC("기타", false);

    private final String label;
    /** 만료 관리(갱신 경보) 대상 여부. 보건증 등 갱신 의무 서류. */
    private final boolean expiryTracked;

    DocumentType(String label, boolean expiryTracked) {
        this.label = label;
        this.expiryTracked = expiryTracked;
    }
}
