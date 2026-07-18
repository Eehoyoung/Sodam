package com.rich.sodam.aop.logging;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LogArgMaskerTest {
    @Test
    void masksCompositeCredentialAndElectronicSignatureNames() {
        assertThat(LogArgMasker.mask(
                new Object[]{"raw", "signed", "receipt", "object"},
                new String[]{"stepUpPassword", "signedData", "receiptRef", "objectRefEnc"}))
                .isEqualTo("[[MASKED], [MASKED], [MASKED], [MASKED]]");
    }

    @Test
    void masksSensitiveRecordFields() {
        assertThat(LogArgMasker.maskOne(new Credential("pw", "01012345678", "safe")))
                .contains("password=[MASKED]", "phone=[MASKED]", "label=safe")
                .doesNotContain("01012345678", "pw");
    }

    private record Credential(String password, String phone, String label) {}
}
