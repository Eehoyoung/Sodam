package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentDigestTest {

    @Test
    void createsSha256HexAndProviderPdfToken() {
        DocumentDigest digest = DocumentDigest.sha256("abc".getBytes(StandardCharsets.UTF_8));

        assertThat(digest.hex()).isEqualTo(
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(digest.base64Url()).isEqualTo(
                "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
        assertThat(digest.base64Url()).doesNotContain("=");
    }

    @Test
    void rejectsEmptyDocument() {
        assertThatThrownBy(() -> DocumentDigest.sha256(new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
