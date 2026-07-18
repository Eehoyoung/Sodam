package com.rich.sodam.core.electronicsignature;

import java.io.InputStream;

/**
 * 전자서명 원본·증적 전용 비공개 객체 저장소 포트.
 * 구현은 public URL을 반환하지 않으며, 호출자는 반환된 opaque ref를 암호화해 DB에 저장한다.
 */
public interface PrivateSignatureObjectStorage {

    enum ObjectKind { UNSIGNED_PDF, SIGNED_DATA, COMPLETION_MANIFEST, COMPLETION_CERTIFICATE }

    String put(ObjectKind kind, Long envelopeId, InputStream source, long contentLength, String contentType);

    InputStream open(String opaqueObjectRef);

    void delete(String opaqueObjectRef);
}
