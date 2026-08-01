package com.rich.sodam.controller;

import com.rich.sodam.domain.type.CertificateType;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.CertificateService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CertificateControllerSecurityTest {

    @Test
    void certificateDownloadPreventsSensitivePdfFromBeingStoredByBrowserCaches() {
        CertificateService certificateService = mock(CertificateService.class);
        CertificateController controller = new CertificateController(certificateService);
        UserPrincipal principal = new UserPrincipal(7L, "employee@sodam.dev", List.of());
        when(certificateService.generate(7L, 3L, CertificateType.EMPLOYMENT))
                .thenReturn(new byte[]{'%', 'P', 'D', 'F'});

        ResponseEntity<byte[]> response = controller.my(principal, 3L, CertificateType.EMPLOYMENT);

        assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL))
                .contains("no-store")
                .contains("private");
        assertThat(response.getHeaders().getFirst(HttpHeaders.PRAGMA)).isEqualTo("no-cache");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
    }
}
