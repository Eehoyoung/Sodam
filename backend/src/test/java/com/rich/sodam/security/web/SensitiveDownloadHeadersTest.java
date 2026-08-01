package com.rich.sodam.security.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDownloadHeadersTest {

    @Test
    void appliesTheNonStorableDownloadPolicyForEverySensitiveAttachmentType() {
        HttpHeaders headers = new HttpHeaders();

        SensitiveDownloadHeaders.apply(headers);

        assertThat(headers.getFirst(HttpHeaders.CACHE_CONTROL))
                .contains("no-store")
                .contains("private");
        assertThat(headers.getFirst(HttpHeaders.PRAGMA)).isEqualTo("no-cache");
        assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
    }
}
