package com.rich.sodam.domain.type;

public enum SignatureSubjectType {
    MANAGER_DELEGATION,
    LABOR_CONTRACT,
    LABOR_CONTRACT_AMENDMENT,
    GUARDIAN_CONSENT,
    /**
     * 퇴사 확인서(260817 퇴사 처리 기능 계획서 WP-4) — 신설 시 반드시
     * {@code ElectronicSignatureRetentionPolicies}에 대응하는 보존정책 컴포넌트를 함께 추가할 것
     * (HC-14, GUARDIAN_CONSENT처럼 정책 없이 방치하면 파기의무 위반 소지가 있다).
     */
    RESIGNATION_ACKNOWLEDGMENT
}
