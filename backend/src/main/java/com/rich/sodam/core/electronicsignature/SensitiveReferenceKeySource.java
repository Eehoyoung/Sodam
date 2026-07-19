package com.rich.sodam.core.electronicsignature;

/**
 * {@link SensitiveReferenceCrypto}가 필요로 하는 키 자재의 core 포트 (WP-10).
 *
 * core 패키지가 {@code config.integration.IntegrationProperties}를 직접 참조하던 것을
 * 제거하기 위한 경계 — 실제 구현(설정값 → 이 인터페이스)은 config 계층이 담당한다.
 */
public interface SensitiveReferenceKeySource {
    String refEncryptionKey();

    String refHmacPepper();

    boolean live();
}
