package com.rich.sodam.domain.type;

/**
 * 증명서 종류 — 재직증명서(EMPLOYMENT) / 경력증명서(CAREER).
 */
public enum CertificateType {
    /** 재직증명서 — 현재 재직 중인 직원만 발급 가능. */
    EMPLOYMENT,
    /** 경력증명서 — 과거 소속(퇴사 포함)도 발급 가능. */
    CAREER
}
