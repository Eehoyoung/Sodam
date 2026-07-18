package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.PrivateSignatureObjectStorage;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalPrivateSignatureObjectStorageTest {
    @Test
    void streamsPrivateObjectWithoutPublicUrlAndRejectsTraversal() throws Exception {
        LocalPrivateSignatureObjectStorage storage = new LocalPrivateSignatureObjectStorage();
        byte[] data = "signed-evidence".getBytes(StandardCharsets.UTF_8);
        String ref = storage.put(PrivateSignatureObjectStorage.ObjectKind.SIGNED_DATA, 7L,
                new ByteArrayInputStream(data), data.length, "application/octet-stream");
        try {
            assertThat(ref).doesNotContain("http", "uploads");
            assertThat(storage.open(ref).readAllBytes()).isEqualTo(data);
            assertThatThrownBy(() -> storage.open("../../secret"))
                    .isInstanceOf(IllegalArgumentException.class);
        } finally {
            storage.delete(ref);
        }
    }
}
