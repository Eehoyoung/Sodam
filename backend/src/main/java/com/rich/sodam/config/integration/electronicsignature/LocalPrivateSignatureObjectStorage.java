package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/** dev/test 전용 private object store. 외부 공개 경로·URL을 만들지 않는다. */
@Component
@ConditionalOnExpression("'${sodam.integration.electronic-signature.mode:off}'.toLowerCase() != 'live'")
public class LocalPrivateSignatureObjectStorage implements PrivateSignatureObjectStorage {
    private static final Path ROOT = Path.of("./private-esign-objects").toAbsolutePath().normalize();

    @Override
    public String put(ObjectKind kind, Long envelopeId, InputStream source, long contentLength, String contentType) {
        if (kind == null || envelopeId == null || source == null || contentLength < 0) {
            throw new IllegalArgumentException("전자서명 객체 저장 인자가 올바르지 않습니다.");
        }
        String ref = kind.name().toLowerCase() + "/" + envelopeId + "/" + UUID.randomUUID();
        Path target = safePath(ref);
        try {
            Files.createDirectories(target.getParent());
            try (OutputStream out = Files.newOutputStream(target)) {
                source.transferTo(out);
            }
            if (Files.size(target) != contentLength) {
                Files.deleteIfExists(target);
                throw new IllegalStateException("전자서명 객체 길이가 일치하지 않습니다.");
            }
            return ref;
        } catch (IOException e) {
            throw new IllegalStateException("전자서명 private object 저장에 실패했습니다.", e);
        }
    }

    @Override
    public InputStream open(String opaqueObjectRef) {
        try {
            return Files.newInputStream(safePath(opaqueObjectRef));
        } catch (IOException e) {
            throw new IllegalStateException("전자서명 private object 조회에 실패했습니다.", e);
        }
    }

    @Override
    public void delete(String opaqueObjectRef) {
        try {
            Files.deleteIfExists(safePath(opaqueObjectRef));
        } catch (IOException e) {
            throw new IllegalStateException("전자서명 private object 삭제에 실패했습니다.", e);
        }
    }

    private Path safePath(String ref) {
        if (ref == null || ref.isBlank()) throw new IllegalArgumentException("object ref가 비어 있습니다.");
        Path path = ROOT.resolve(ref).normalize();
        if (!path.startsWith(ROOT)) throw new IllegalArgumentException("허용되지 않은 object ref입니다.");
        return path;
    }
}
